export interface SessionUser {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  hospitalId: string;
  hospitalNome: string;
  avatar?: string;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  description?: string;
}

export interface DashboardConfig {
  [key: string]: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}
