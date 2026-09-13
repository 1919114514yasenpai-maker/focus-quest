import React from 'react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-400">利用規約 (Terms of Service)</h1>
          <p className="text-xs text-slate-400 mt-1">アプリケーション名: Focus-quest-study (Focus Quest)</p>
          <p className="text-xs text-emerald-400 font-bold mt-0.5">※ このゲームはwaseappによって制作されました。</p>
          <p className="text-xs text-slate-400">制定日: 2026年9月7日</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">1. 本規約の適用および制作・権利</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            本利用規約（以下「本規約」）は、Focus-quest-study（以下「当アプリ」「本ゲーム」）の利用に関する条件を、利用者と当アプリ開発者との間で定めるものです。本ゲームはwaseappによって制作されました。利用者は、当アプリを利用することにより、本規約に同意したものとみなされます。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">2. アカウントおよび認証</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            利用者は、Googleアカウントを用いてログインを行うことができます。Googleアカウントの管理責任は利用者に帰属し、アカウント情報の不正利用等によって生じた損害について、開発者は責任を負いません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">3. 禁止事項</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            利用者は、当アプリの利用にあたり、以下の行為を行ってはなりません。
          </p>
          <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 pl-2">
            <li>法令または公序良俗に違反する行為</li>
            <li>サーバーやネットワークの機能を妨害・破損する不正アクセス行為</li>
            <li>他の利用者のデータやアカウントを不正に取得または利用する行為</li>
            <li>当アプリの運営を妨害する行為</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">4. 免責事項</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            当アプリは現状有姿（AS IS）で提供されます。開発者は、当アプリの完全性、有用性、特定目的への適合性について明示または黙示を問わず保証しません。また、当アプリの利用または利用不能により生じた損害について、一切の責任を負いません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-amber-300">5. お問い合わせ</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            本規約に関するお問い合わせは、以下のメールアドレスまでご連絡ください。
          </p>
          <p className="text-sm text-amber-400 font-mono">aimutsu0120@gmail.com</p>
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
