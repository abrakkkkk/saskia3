import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer footer-compacto">
      <p>&copy; {new Date().getFullYear()} Saskia Saúde Integrada</p>
      <nav aria-label="Institucional">
        <Link href="/politicas-privacidade" prefetch={false}>Privacidade</Link>
        <Link href="/sobre-nos" prefetch={false}>Sobre</Link>
        <Link href="/suporte" prefetch={false}>Suporte</Link>
      </nav>
    </footer>
  );
}
