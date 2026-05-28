import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-grid">
          <div className="footer-section">
            <h3><i className="las la-hospital"></i> Saskia Saúde</h3>
            <p>Sistema Integrado de Gestão Hospitalar<br />Especialistas em soluções para saúde.</p>
            <div className="footer-contact">
              <p><i className="las la-map-marker"></i> R. Azevedo Bolão, 1369 - Parquelândia, Fortaleza - CE</p>
              <p><i className="las la-phone"></i> (85) 9 98228864</p>
              <p><i className="las la-envelope"></i> marcelomarinhomouraapp@gmail.com</p>
            </div>
          </div>
          <div className="footer-section">
            <h3><i className="las la-link"></i> Links Rápidos</h3>
            <ul>
              <li><Link href="/dashboard"><i className="las la-angle-right"></i> Dashboard</Link></li>
              <li><Link href="/pacientes"><i className="las la-angle-right"></i> Pacientes</Link></li>
              <li><Link href="/agenda"><i className="las la-angle-right"></i> Agenda</Link></li>
              <li><Link href="/chat"><i className="las la-angle-right"></i> Chat Interno</Link></li>
              <li><Link href="/admin"><i className="las la-angle-right"></i> Admin</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3><i className="las la-building"></i> Institucional</h3>
            <ul>
              <li><Link href="/sobre-nos"><i className="las la-angle-right"></i> Sobre Nós</Link></li>
              <li><Link href="/politicas-privacidade"><i className="las la-angle-right"></i> Política de Privacidade</Link></li>
              <li><Link href="/feedback"><i className="las la-angle-right"></i> Feedback</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3><i className="las la-handshake"></i> Nossos Parceiros</h3>
            <div className="footer-partners">
              <div className="partner-card">
                <Image src="/images/uniforpar.svg" alt="Uniforpar" width={120} height={50} />
                <span>Uniforpar</span>
              </div>
              <div className="partner-card">
                <Image src="/images/enfbia.png" alt="EnfBia" width={120} height={50} />
                <span>EnfBia</span>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Saskia Saúde Integrada. Todos os direitos reservados.</p>
          <div className="footer-social">
            <a href="#" aria-label="Facebook"><i className="lab la-facebook-f"></i></a>
            <a href="#" aria-label="Instagram"><i className="lab la-instagram"></i></a>
            <a href="#" aria-label="LinkedIn"><i className="lab la-linkedin-in"></i></a>
            <a href="#" aria-label="YouTube"><i className="lab la-youtube"></i></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
