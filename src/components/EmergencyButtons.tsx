'use client';

import { AlertTriangle, HeartPulse } from 'lucide-react'

export default function EmergencyButtons() {
  return (
    <div className="perfil-botoes-emergencia" aria-describedby="emergency-flow-unavailable">
      <p id="emergency-flow-unavailable" role="status">
        Acionamentos indisponíveis até a implantação e validação do fluxo institucional.
      </p>
      <button className="btn-emergencia btn-panico" type="button" disabled>
        <AlertTriangle aria-hidden="true" /> Botão do pânico indisponível
      </button>
      <button className="btn-emergencia btn-pcr" type="button" disabled>
        <HeartPulse aria-hidden="true" /> Alerta de PCR indisponível
      </button>
    </div>
  )
}
