export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Layout vazio para a página de login - não aplicar o layout do admin
  return <>{children}</>
}
