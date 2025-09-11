export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm extends LoginForm {
  confirmPassword: string;
}

export interface AuthState {
  user: any;
  session: any;
  // loading: boolean;
  // error: string | null;
}
