export interface UserData {
  balance: number;
  debt: number;
  lastLoginDate: string;
  updatedAt: string | null;
  createdAt: string | null;
  email: string;
  role?: 'user' | 'admin';
  missions?: {
    daily?: Record<string, any>;
    weekly?: Record<string, any>;
    monthly?: Record<string, any>;
  };
  stats?: {
    gamesPlayed: number;
    totalWon: number;
  };
}
