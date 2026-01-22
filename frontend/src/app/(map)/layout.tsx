export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Map pages use full-screen layout without any chrome
  return <>{children}</>;
}
