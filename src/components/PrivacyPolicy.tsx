import React from 'react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-400">プライバシーポリシー (Privacy Policy)</h1>
          <p className="text-xs text-slate-400 mt-1">アプリケーション名: Focus-quest-study (Focus Quest)</p>
          <p className="text-xs text-slate-400">最終改定日: 2026年9月7日</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">1. はじめに</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Focus-quest-study（以下「当アプリ」）は、勉強・作業の集中時間をRPGゲーム形式で管理できる生産性向上アプリケーションです。当アプリは、利用者の個人情報の保護を重要視し、以下の方針に従って適切に取り扱います。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">2. 取得する情報およびその利用目的</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            当アプリでは、サービスの提供および利便性向上のために以下の情報を取得・利用します。
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pl-2">
            <li>
              <strong className="text-slate-100">Googleアカウント情報（メールアドレス・ユーザーID・表示名・アイコン画像）:</strong>
              <br />
              Firebase Authenticationを通じたユーザー認証、クラウドセーブデータの紐付け、複数端末間でのセーブデータ同期のために使用します。
            </li>
            <li>
              <strong className="text-slate-100">ゲームプレイデータ（レベル、装備、集中時間、討伐記録など）:</strong>
              <br />
              ゲームの進行状況の保存およびクラウドへのバックアップのために保存します。
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">3. データの保存場所と管理</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            利用者のデータは、利用者の端末ローカルストレージ（IndexedDB/LocalStorage）およびGoogle Cloudが提供するセキュアなFirestoreクラウドデータベースに暗号化通信（HTTPS/TLS）を用いて保存されます。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">4. データの削除および連携解除</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            利用者は、当アプリの設定画面よりいつでもログアウトすることができます。また、Googleアカウントの
            <a 
              href="https://myaccount.google.com/permissions" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline mx-1"
            >
              セキュリティ設定（サードパーティ製アプリへのアクセス権）
            </a>
            から、いつでも当アプリへのアクセス権限を即座に取り消すことができます。
            データの完全削除をご希望の場合は、下記のお問い合わせ先までご連絡ください。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">5. お問い合わせ先</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            本プライバシーポリシーや個人情報の取り扱いに関するご質問、データ削除のご要望は、以下のデベロッパー連絡先までお問い合わせください。
          </p>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm space-y-1">
            <p><strong className="text-slate-200">開発者 / 運営者:</strong> Focus-quest-study Development Team</p>
            <p><strong className="text-slate-200">サポート・連絡先メールアドレス:</strong> aimutsu0120@gmail.com</p>
            <p><strong className="text-slate-200">ウェブサイト:</strong> <a href="https://focus-quest-study.web.app/" className="text-amber-400 hover:underline">https://focus-quest-study.web.app/</a></p>
          </div>
        </section>

        <div className="pt-6 border-t border-slate-800 text-center">
          <a 
            href="/" 
            className="inline-block px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition"
          >
            ← アプリに戻る (Back to App)
          </a>
        </div>
      </div>
    </div>
  );
};
