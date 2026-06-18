// TODO: onboarding real — crear familia o aceptar invitación pendiente.
// Se llega aquí cuando el usuario tiene sesión Supabase pero no pertenece a ninguna familia.
export default function OnboardingPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FAF7F2] px-6">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-extrabold text-[#252525] mb-3">Configura tu familia</h1>
        <p className="text-sm text-[#77716A] leading-relaxed">
          Todavía no perteneces a ninguna familia en Nido. Crea una nueva o pide a tu familia que te invite.
        </p>
      </div>
    </div>
  )
}
