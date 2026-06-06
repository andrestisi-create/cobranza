import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
            C
          </div>
          <h1 className="text-xl font-bold text-slate-900">Cobranza UA Blended</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cobranza y pre-cobranza de ventas Sence
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
