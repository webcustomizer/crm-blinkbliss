export type LeadFormData = {
  name?: string;
  phone: string;
  email: string;
  city: string;
  age: string;
  purpose: string;
  currentStatus: string;
  bestTimeToReach: string;
  willingToAttendTraining: boolean | null;
};

export interface LeadAssignedTo {
  id: string;
  name: string;
}

export interface LeadFollowUp {
  id: string;
  remarks: string;
  nextFollowUp: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  } | null;
}

export interface LeadActivity {
  id: string;
  message: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  } | null;
}

export interface LeadStatusHistory {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy?: {
    id: string;
    name: string;
  } | null;
}

export interface LeadDetails {
  id: string;
  name?: string | null;
  phone: string;
  email?: string | null;
  city?: string | null;
  age?: number | null;
  purpose?: string | null;
  currentStatus?: string | null;
  bestTimeToReach?: string | null;
  willingToAttendTraining?: boolean | null;
  status: string;
  completion?: string;
  remarks?: string | null;
  followUpCount: number;
  lastFollowUp?: string | null;
  nextFollowUp?: string | null;
  assignedTo?: LeadAssignedTo | null;
  followups?: LeadFollowUp[];
  activities?: LeadActivity[];
  statusHistory?: LeadStatusHistory[];
}
