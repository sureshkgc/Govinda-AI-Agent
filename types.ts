
export interface BillingInfo {
  balance: number;
  lastInvoiceAmount: number;
  lastInvoiceDate: string;
  dueDate: string;
  planName: string;
  pastDue: boolean;
}

export interface TicketInfo {
  ticketId: string;
  priority: 'Normal' | 'High' | 'Low';
  eta: string;
}

export interface OutageInfo {
  status: 'No outage reported' | 'Partial outage' | 'Full outage';
  eta?: string;
}

export interface Technician {
  id: string;
  name: string;
  skills: string[];
}

export interface Ticket {
  id: string;
  customerId: string;
  customerName: string;
  category: string;
  details: string;
  status: 'New' | 'Assigned' | 'In Progress' | 'Resolved';
  assignedTo?: string; // Technician ID
}

export interface Transcript {
  speaker: 'user' | 'model' | 'system';
  text: string;
}

export interface CallStats {
  totalCalls: number;
  attendedCalls: number;
  missedCalls: number;
  forwardedCalls: number;
}