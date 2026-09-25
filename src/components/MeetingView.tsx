import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  ShieldCheck,
  Users,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
  Lock,
  Volume2,
  RefreshCw,
  Signal,
  AlertTriangle,
} from 'lucide-react';
import { User, PeerSession } from '../types';
import { socketClient } from '../lib/websocket';
import { generateSASVerification, getCurrentKeyFingerprint } from '../lib/crypto';
import { hasPermission } from '../lib/permissions';
import { db, auth, sendP2PSignalToFirestore } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface MeetingViewProps {
  currentUser: User;
  initialRoomId?: string;
  onLeaveMeeting: () => void;
  onOpenSecurityAudit: () => void;
}

export const MeetingView: React.FC<MeetingViewProps> = ({
  currentUser,
  initialRoomId = 'WASE-SECURE-ROOM',
  onLeaveMeeting,
  onOpenSecurityAudit,
}) => {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [inCall, setInCall] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [inMeetingMessages, setInMeetingMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string }>
  >([]);
  const [sasVerified, setSasVerified] = useState(false);
  const [useVirtualCamera, setUseVirtualCamera] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'reconnecting'>('excellent');

  // Unique Peer ID for this specific tab/session (crucial for multiple tabs/same user testing)
  const myPeerIdRef = useRef<string>(`peer_${currentUser.id}_${Math.random().toString(36).substring(2, 9)}`);

  // WebRTC Peer States
  const [peers, setPeers] = useState<Map<string, PeerSession>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // SAS Verification computation
  const sas = generateSASVerification(roomId, getCurrentKeyFingerprint());

  // WebRTC ICE Configuration (Rich STUN servers for robust NAT traversal)
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' },
    ],
    iceCandidatePoolSize: 10,
  };

  // Virtual Camera generator (for sandboxed iframes or systems without physical webcam)
  const setupVirtualMediaStream = useCallback((): MediaStream => {
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    let frame = 0;
    let animId: number;

    const draw = () => {
      frame++;
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // P2P Grid pattern
      ctx.strokeStyle = '#312e81';
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 360);
        ctx.stroke();
      }

      // Animated pulsating center avatar
      const radius = 45 + Math.sin(frame * 0.05) * 4;
      ctx.beginPath();
      ctx.arc(320, 150, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#4f46e5';
      ctx.fill();
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Avatar Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase() || 'ME', 320, 160);

      // User Label & E2EE badge
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(currentUser.name, 320, 220);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText('🔒 WebRTC P2P (AES-256 Encrypted)', 320, 245);

      // Soundwave visualization
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 20; i++) {
        const h = Math.sin(frame * 0.1 + i) * 15;
        ctx.moveTo(220 + i * 10, 290 - h);
        ctx.lineTo(220 + i * 10, 290 + h);
      }
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };
    draw();

    // Create stream from canvas
    const canvasStream = canvas.captureStream(30);

    // Create silent/synth audio track to guarantee audio stream negotiation
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001; // nearly silent carrier
      osc.connect(gain);
      gain.connect(dst);
      osc.start();

      const audioTrack = dst.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
    } catch (e) {
      console.warn('AudioContext carrier generation ignored:', e);
    }

    return canvasStream;
  }, [currentUser]);

  // Flush queued ICE candidates after remote description is set
  const flushIceCandidates = async (peerKey: string, pc: RTCPeerConnection) => {
    const queue = iceCandidateQueues.current.get(peerKey) || [];
    if (queue.length > 0) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error flushing queued ICE candidate:', e);
        }
      }
      iceCandidateQueues.current.set(peerKey, []);
    }
  };

  // Create WebRTC Peer Connection with comprehensive event handlers
  const createPeerConnection = useCallback((
    targetPeerId: string,
    targetUserId: string,
    targetUserName: string,
    targetAvatar?: string
  ): RTCPeerConnection => {
    // If existing connection exists, close it cleanly
    if (peerConnections.current.has(targetPeerId)) {
      try {
        peerConnections.current.get(targetPeerId)?.close();
      } catch (e) {
        console.warn('Error closing existing peer connection:', e);
      }
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current.set(targetPeerId, pc);

    // Add local tracks to this peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Remote Track Listener
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetPeerId) || {
          peerId: targetPeerId,
          userId: targetUserId,
          userName: targetUserName,
          avatar: targetAvatar,
        };
        next.set(targetPeerId, {
          ...existing,
          stream: remoteStream,
          connectionState: pc.iceConnectionState,
        });
        return next;
      });
    };

    // ICE Candidate generation & signaling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send via WebSocket
        socketClient.send('rtc:ice-candidate', {
          targetPeerId,
          targetUserId,
          candidate: event.candidate,
        });

        // Hybrid Firestore signaling fallback
        sendP2PSignalToFirestore({
          id: `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          roomId,
          type: 'candidate',
          senderPeerId: myPeerIdRef.current,
          targetPeerId,
          payload: { candidate: event.candidate },
        });
      }
    };

    // ICE Connection State Change Listener
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setPeers((prev) => {
        const next = new Map(prev);
        const peer = next.get(targetPeerId);
        if (peer) {
          next.set(targetPeerId, { ...peer, connectionState: state });
        }
        return next;
      });

      if (state === 'connected' || state === 'completed') {
        setNetworkQuality('excellent');
      } else if (state === 'failed' || state === 'disconnected') {
        setNetworkQuality('reconnecting');
        // Attempt ICE restart if failed
        if (state === 'failed') {
          try {
            pc.restartIce();
          } catch (e) {
            console.warn('ICE restart not supported or failed:', e);
          }
        }
      }
    };

    return pc;
  }, [roomId]);

  // Start Meeting / Join Room
  const startMeeting = async () => {
    try {
      let stream: MediaStream;

      if (useVirtualCamera) {
        stream = setupVirtualMediaStream();
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 360 },
            audio: true,
          });
        } catch (mediaErr) {
          console.warn('Physical camera/mic inaccessible, auto-switching to virtual avatar camera:', mediaErr);
          setUseVirtualCamera(true);
          stream = setupVirtualMediaStream();
        }
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setInCall(true);

      // Signal join room via WebSocket
      socketClient.send('rtc:join-room', {
        roomId,
        peerId: myPeerIdRef.current,
        userId: currentUser.id,
        userName: currentUser.name,
        avatar: currentUser.avatar,
      });

      // Hybrid Firestore announce join
      sendP2PSignalToFirestore({
        id: `join_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        roomId,
        type: 'join',
        senderPeerId: myPeerIdRef.current,
        payload: {
          userId: currentUser.id,
          userName: currentUser.name,
          avatar: currentUser.avatar,
        },
      });

      // Add system log
      setInMeetingMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'システム (P2P)',
          text: `暗号化会議室 [${roomId}] に参加しました。WebRTC P2Pメッシュ接続を確立中です。`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Failed to start meeting:', err);
    }
  };

  // End Meeting / Leave
  const leaveMeeting = () => {
    socketClient.send('rtc:leave-room', {
      roomId,
      peerId: myPeerIdRef.current,
      userId: currentUser.id,
    });

    sendP2PSignalToFirestore({
      id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      roomId,
      type: 'leave',
      senderPeerId: myPeerIdRef.current,
    });

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    iceCandidateQueues.current.clear();
    setPeers(new Map());

    setInCall(false);
    onLeaveMeeting();
  };

  // WebRTC Signaling Logic (WebSocket + Firestore Hybrid)
  useEffect(() => {
    if (!inCall) return;

    // 1. Room Peers list received: The joining peer creates offers to all existing peers
    const unsubPeers = socketClient.on('rtc:room-peers', async (data: any) => {
      if (data.roomId !== roomId) return;
      for (const peer of data.peers) {
        const targetPeerId = peer.peerId || peer.userId;
        if (targetPeerId === myPeerIdRef.current) continue;

        const pc = createPeerConnection(targetPeerId, peer.userId, peer.userName, peer.avatar);
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);

          socketClient.send('rtc:offer', {
            targetPeerId,
            targetUserId: peer.userId,
            fromAvatar: currentUser.avatar,
            offer,
          });

          sendP2PSignalToFirestore({
            id: `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            roomId,
            type: 'offer',
            senderPeerId: myPeerIdRef.current,
            targetPeerId,
            payload: { offer, fromUserId: currentUser.id, fromUserName: currentUser.name, fromAvatar: currentUser.avatar },
          });
        } catch (e) {
          console.error('Error creating RTC offer for peer:', peer, e);
        }
      }
    });

    // 2. Another peer joined notification
    const unsubJoined = socketClient.on('rtc:peer-joined', (data: any) => {
      const peerKey = data.peerId || data.userId;
      if (data.roomId !== roomId || peerKey === myPeerIdRef.current) return;

      setPeers((prev) => {
        const next = new Map(prev);
        next.set(peerKey, {
          peerId: peerKey,
          userId: data.userId || peerKey,
          userName: data.userName || '参加者',
          avatar: data.avatar,
          connectionState: 'checking',
        });
        return next;
      });

      setInMeetingMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'システム (P2P)',
          text: `${data.userName || '参加者'} が参加しました。P2P接続をハンドシェイク中...`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    });

    // 3. Remote Offer received
    const unsubOffer = socketClient.on('rtc:offer', async (data: any) => {
      const fromPeerId = data.fromPeerId || data.fromUserId;
      if (fromPeerId === myPeerIdRef.current) return;

      const pc = createPeerConnection(fromPeerId, data.fromUserId || fromPeerId, data.fromUserName || 'リモート', data.fromAvatar);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        await flushIceCandidates(fromPeerId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketClient.send('rtc:answer', {
          targetPeerId: fromPeerId,
          targetUserId: data.fromUserId,
          answer,
        });

        sendP2PSignalToFirestore({
          id: `ans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          roomId,
          type: 'answer',
          senderPeerId: myPeerIdRef.current,
          targetPeerId: fromPeerId,
          payload: { answer, fromUserId: currentUser.id },
        });
      } catch (e) {
        console.error('Error handling RTC offer from peer:', fromPeerId, e);
      }
    });

    // 4. Remote Answer received
    const unsubAnswer = socketClient.on('rtc:answer', async (data: any) => {
      const fromPeerId = data.fromPeerId || data.fromUserId;
      if (fromPeerId === myPeerIdRef.current) return;

      const pc = peerConnections.current.get(fromPeerId);
      if (pc) {
        try {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await flushIceCandidates(fromPeerId, pc);
          }
        } catch (e) {
          console.error('Error setting remote description from answer:', e);
        }
      }
    });

    // 5. Remote ICE candidate received
    const unsubCandidate = socketClient.on('rtc:ice-candidate', async (data: any) => {
      const fromPeerId = data.fromPeerId || data.fromUserId;
      if (fromPeerId === myPeerIdRef.current || !data.candidate) return;

      const pc = peerConnections.current.get(fromPeerId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('Error adding ICE candidate:', e);
        }
      } else {
        // Queue until remoteDescription is set
        const queue = iceCandidateQueues.current.get(fromPeerId) || [];
        queue.push(data.candidate);
        iceCandidateQueues.current.set(fromPeerId, queue);
      }
    });

    // 6. Remote Peer left
    const unsubLeft = socketClient.on('rtc:peer-left', (data: any) => {
      const peerKey = data.peerId || data.userId;
      const pc = peerConnections.current.get(peerKey);
      if (pc) {
        pc.close();
        peerConnections.current.delete(peerKey);
      }
      iceCandidateQueues.current.delete(peerKey);
      setPeers((prev) => {
        const next = new Map(prev);
        next.delete(peerKey);
        return next;
      });
      setInMeetingMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'システム (P2P)',
          text: `参加者が退出しました。`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    });

    // 7. Firestore Hybrid Signaling listener
    let unsubFirestoreSignals = () => {};
    if (auth.currentUser) {
      try {
        const signalsQuery = query(
          collection(db, 'p2p_signals'),
          where('roomId', '==', roomId)
        );
        unsubFirestoreSignals = onSnapshot(signalsQuery, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const signal = change.doc.data();
              if (signal.senderPeerId === myPeerIdRef.current) return;
              if (signal.targetPeerId && signal.targetPeerId !== myPeerIdRef.current) return;

              if (signal.type === 'offer' && signal.payload?.offer) {
                const pc = createPeerConnection(signal.senderPeerId, signal.payload.fromUserId, signal.payload.fromUserName, signal.payload.fromAvatar);
                if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
                  try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.payload.offer));
                    await flushIceCandidates(signal.senderPeerId, pc);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendP2PSignalToFirestore({
                      id: `ans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                      roomId,
                      type: 'answer',
                      senderPeerId: myPeerIdRef.current,
                      targetPeerId: signal.senderPeerId,
                      payload: { answer, fromUserId: currentUser.id },
                    });
                  } catch (e) {
                    console.warn('Firestore fallback offer handle error:', e);
                  }
                }
              } else if (signal.type === 'answer' && signal.payload?.answer) {
                const pc = peerConnections.current.get(signal.senderPeerId);
                if (pc && pc.signalingState === 'have-local-offer') {
                  try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.payload.answer));
                    await flushIceCandidates(signal.senderPeerId, pc);
                  } catch (e) {
                    console.warn('Firestore fallback answer handle error:', e);
                  }
                }
              } else if (signal.type === 'candidate' && signal.payload?.candidate) {
                const pc = peerConnections.current.get(signal.senderPeerId);
                if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(signal.payload.candidate));
                  } catch (e) {
                    console.warn('Firestore fallback candidate error:', e);
                  }
                } else {
                  const queue = iceCandidateQueues.current.get(signal.senderPeerId) || [];
                  queue.push(signal.payload.candidate);
                  iceCandidateQueues.current.set(signal.senderPeerId, queue);
                }
              }
            }
          });
        });
      } catch (err) {
        console.warn('Firestore hybrid signaling setup non-critical error:', err);
      }
    }

    return () => {
      unsubPeers();
      unsubJoined();
      unsubOffer();
      unsubAnswer();
      unsubCandidate();
      unsubLeft();
      unsubFirestoreSignals();
    };
  }, [inCall, roomId, createPeerConnection, currentUser]);

  // Audio mute toggle
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // Video mute toggle
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  // Screen share toggle
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in all active peer connections
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          // Revert to camera stream
          if (localStreamRef.current && localVideoRef.current) {
            const originalVideo = localStreamRef.current.getVideoTracks()[0];
            peerConnections.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
              if (sender && originalVideo) sender.replaceTrack(originalVideo);
            });
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    } else {
      // Revert to local camera stream
      if (localStreamRef.current && localVideoRef.current) {
        const originalVideo = localStreamRef.current.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && originalVideo) sender.replaceTrack(originalVideo);
        });
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendMeetingChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setInMeetingMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: currentUser.name,
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Meeting Header */}
      <div className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>P2P 暗号化ミーティング</span>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                {roomId}
              </span>
            </h1>
          </div>

          {/* Copy Room ID */}
          <button
            onClick={copyRoomCode}
            className="flex items-center space-x-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition"
            title="ルームIDをコピーして別のタブや端末から参加"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{isCopied ? 'コピー完了' : '共有ID'}</span>
          </button>
        </div>

        {/* Cryptographic SAS MITM Verification Pill */}
        <div className="flex items-center space-x-2">
          <div
            onClick={onOpenSecurityAudit}
            className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-lg cursor-pointer hover:border-emerald-500 transition"
            title="中間者攻撃(MITM)防止用の暗号化認証コード"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-300 font-mono">認証コード:</span>
            <div className="flex space-x-1 text-sm">
              {sas.emojis.map((emoji, idx) => (
                <span key={idx} className="scale-110">
                  {emoji}
                </span>
              ))}
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold ml-1">{sas.code}</span>
          </div>

          <button
            onClick={() => setSasVerified(!sasVerified)}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition ${
              sasVerified
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {sasVerified ? '✓ 暗号一致確認済' : '照合確認'}
          </button>
        </div>
      </div>

      {/* Main Video Grid & Sidebar Container */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left Video Stage */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/60 border border-slate-800/80 rounded-2xl relative overflow-hidden p-3 shadow-inner">
          {!inCall ? (
            /* Lobby Screen before joining */
            <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto">
                <Video className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">P2P 暗号化会議への入室</h2>
                <p className="text-xs text-slate-400 mt-1">
                  WebRTC直接通信によりサーバーに映像・音声データが保存されないセキュアな設計です。
                </p>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold text-slate-300">ルームID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="例: WASE-ROOM-101"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Virtual Camera Toggle */}
              <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-slate-300 font-medium">暗号化仮想アバターカメラを使用</span>
                </div>
                <input
                  type="checkbox"
                  checked={useVirtualCamera}
                  onChange={(e) => setUseVirtualCamera(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <button
                id="btn-join-meeting"
                onClick={startMeeting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>今すぐ参加する</span>
              </button>
            </div>
          ) : (
            /* Active Call Grid */
            <div className="w-full h-full flex flex-col">
              {/* Dynamic Video Grid */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 p-2 overflow-auto">
                {/* Local Video Stream Card */}
                <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-indigo-600/40 shadow flex items-center justify-center group min-h-[220px]">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isVideoMuted ? 'hidden' : ''}`}
                  />
                  {isVideoMuted && (
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <div className="w-16 h-16 rounded-full bg-indigo-900/60 border border-indigo-700 flex items-center justify-center text-xl font-bold text-white">
                        {currentUser.avatar || currentUser.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-300">{currentUser.name} (カメラオフ)</span>
                    </div>
                  )}

                  {/* Local Stream Overlay Tag */}
                  <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-medium flex items-center space-x-1.5 text-slate-200">
                    <span>{currentUser.name} (あなた)</span>
                    {isAudioMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                    <span className="text-[10px] text-emerald-400 font-mono">● ホスト</span>
                  </div>
                </div>

                {/* Remote Peers Video Streams */}
                {Array.from(peers.values()).map((peer) => (
                  <RemotePeerVideo key={peer.peerId || peer.userId} peer={peer} />
                ))}

                {/* Placeholder if single participant */}
                {peers.size === 0 && (
                  <div className="bg-slate-950/80 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-3 min-h-[220px]">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-300">相手の接続を待機中...</h4>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                        別タブまたは別ブラウザで同じルームID「
                        <span className="font-mono text-indigo-400 font-bold">{roomId}</span>
                        」に参加すると、P2P直接ビデオ通話が接続されます。
                      </p>
                    </div>
                    <button
                      onClick={copyRoomCode}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition cursor-pointer"
                    >
                      {isCopied ? 'ルームIDをコピーしました！' : 'ルームIDをコピー'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Floating Control Bar (when in call) */}
          {inCall && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-2xl shadow-2xl flex items-center space-x-3 z-30">
              {/* Mic toggle */}
              <button
                id="btn-meeting-toggle-mic"
                onClick={toggleAudio}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
                  isAudioMuted
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-600/40 hover:bg-rose-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isAudioMuted ? 'マイクをオン' : 'マイクをミュート'}
              >
                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video toggle */}
              <button
                id="btn-meeting-toggle-video"
                onClick={toggleVideo}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
                  isVideoMuted
                    ? 'bg-rose-600/20 text-rose-400 border border-rose-600/40 hover:bg-rose-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isVideoMuted ? 'カメラをオン' : 'カメラをオフ'}
              >
                {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* Screen Share toggle */}
              <button
                id="btn-meeting-toggle-screen"
                disabled={!hasPermission(currentUser.role, 'canShareScreen')}
                onClick={toggleScreenShare}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
                  !hasPermission(currentUser.role, 'canShareScreen')
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : isScreenSharing
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={
                  !hasPermission(currentUser.role, 'canShareScreen')
                    ? '閲覧者 (Viewer) は画面共有権限がありません'
                    : isScreenSharing
                    ? '画面共有を停止'
                    : '画面共有を開始'
                }
              >
                <Monitor className="w-5 h-5" />
              </button>

              {/* Meeting Chat Toggle */}
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer ${
                  isChatOpen
                    ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title="会議チャットを開く"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {/* End Call / Leave */}
              <button
                id="btn-meeting-leave"
                onClick={leaveMeeting}
                className="px-4 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                title="通話を終了して退出"
              >
                <PhoneOff className="w-4 h-4" />
                <span>通話終了</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar: In-Meeting Chat & Peer Info */}
        {inCall && isChatOpen && (
          <aside className="w-72 md:w-80 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-xl">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-white">会議チャット (E2EE)</h3>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>

            {/* In-Meeting Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {inMeetingMessages.map((m) => (
                <div key={m.id} className="text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold text-slate-200">{m.sender}</span>
                    <span>{m.time}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{m.text}</p>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMeetingChat} className="p-2 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="会議参加者にメッセージ..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                送信
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
};

// Subcomponent: Remote Peer Video Box with resilient stream playback & state pill
const RemotePeerVideo: React.FC<{ peer: PeerSession }> = ({ peer }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
      videoRef.current.play().catch((err) => {
        console.warn('Autoplay prevented or stream play interrupted:', err);
      });
    }
  }, [peer.stream]);

  const isConnected = peer.connectionState === 'connected' || peer.connectionState === 'completed';

  return (
    <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow flex items-center justify-center min-h-[220px]">
      {peer.stream ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
          <div className="w-16 h-16 rounded-full bg-indigo-950/80 border border-indigo-700 flex items-center justify-center text-xl font-bold text-white animate-pulse">
            {peer.avatar || peer.userName.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs text-slate-300 font-medium">{peer.userName}</span>
          <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
            {peer.connectionState === 'checking' ? 'P2Pハンドシェイク中...' : 'ビデオストリーム待機中...'}
          </span>
        </div>
      )}

      {/* Peer Label & Connection State */}
      <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-medium flex items-center space-x-1.5 text-slate-200">
        <span>{peer.userName}</span>
        <span
          className={`text-[10px] font-mono flex items-center gap-1 ${
            isConnected ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
          {isConnected ? 'P2P直結 (暗号化)' : '接続中'}
        </span>
      </div>
    </div>
  );
};
