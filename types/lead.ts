export type LeadSource = 
  | "WEBSITE"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "WHATSAPP"
  | "REFERRAL"
  | "WALK_IN"
  | "PHONE_CALL"
  | "OTHER";

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
  source?: LeadSource;
};

export interface LeadAssignedTo {
  id: string;
  name: string;
}

export interface LeadFollowUp {
  id: string;
  remarks: string;
  followUpNumber: number;
  nextFollowUp: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface LeadStatusHistory {
  id: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy?: { id: string; name: string } | null;
}

export interface LeadDetails {
  id: string;
  createdAt: string;
  updatedAt: string;
  name?: string | null;
  phone: string;
  email?: string | null;
  city?: string | null;
  age?: number | null;
  purpose?: string | null;
  currentStatus?: string | null;
  bestTimeToReach?: string | null;
  willingToAttendTraining?: boolean | null;
  source?: string | null;
  status: string;
  completion?: string;
  remarks?: string | null;
  followUpCount: number;
  lastFollowUp?: string | null;
  nextFollowUp?: string | null;
  firstResponseAt?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  mergedIntoId?: string | null;
  assignedTo?: LeadAssignedTo | null;
  followups?: LeadFollowUp[];
  statusHistory?: LeadStatusHistory[];
}

export interface DeviceSession {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string | null;
  isCurrent: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  leadId: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  sender?: { id: string; name: string };
  lead?: { id: string; name: string | null; phone: string } | null;
}

export interface GroupChatMessage {
  id: string;
  content: string;
  senderId: string;
  leadId: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  sender?: { id: string; name: string };
  lead?: { id: string; name: string | null; phone: string } | null;
  reads?: { userId: string; userName: string; readAt: string }[];
}

export interface MentionLead {
  id: string;
  name: string | null;
  phone: string;
}

export interface SalesTargetData {
  id?: string;
  userId: string;
  month: number;
  year: number;
  target: number;
  achieved: number;
}

export interface UserWithTarget extends LeadAssignedTo {
  email: string;
  monthlyTarget: number;
  responseTimeAvg: number;
  isActive: boolean;
  currentMonthAchieved: number;
  currentMonthTarget: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

export interface CRMFullSettings {
  followUp: { first: number; second: number; third: number; max: number };
  automation: { autoDead: boolean; deadAfterDays: number; autoAssign: boolean };
  groupChat: { enabled: boolean };
  security: {
    twoFactorRequired: boolean;
    passwordMinLength: number;
    passwordRequireSpecial: boolean;
    sessionMaxHours: number;
  };
  backup: { autoBackup: boolean; backupFrequencyDays: number };
}
