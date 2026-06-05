export type SpotStatus = "available" | "occupied" | "guest";

export interface Spot {
  id: string; // e.g. "A-01" or "G-101"
  number: number; // e.g. 101, 102
  floor: "G" | "1" | "2" | "Executive";
  quadrant: "A" | "B" | "C" | "D";
  status: SpotStatus;
  occupant: string | null; // e.g. "License Plate K-902-LX" or "User_4329"
  duration: string | null; // e.g. "01h 45m" or timestamp
  isEV?: boolean;
}

export type UserRole = "conductor" | "guardia" | "admin" | "superadmin";

export interface User {
  email: string;
  role: UserRole;
  fullName: string;
}

export interface ActivityLog {
  id: string;
  type: "entry" | "exit" | "maintenance" | "block" | "reserve";
  spotId: string;
  detail: string;
  timestamp: string; // e.g. "2m ago" or short hour string
}

export interface SimulatedStats {
  available: number;
  occupied: number;
  maintenance: number;
  total: number;
}
