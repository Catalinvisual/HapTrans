import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mfaCode: z.string().optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const mfaSetupSchema = z.object({
  password: z.string().min(1),
});

export const mfaVerifySchema = z.object({
  code: z.string().min(1),
});

export const mfaDisableSchema = z.object({
  code: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
export type MfaSetupDto = z.infer<typeof mfaSetupSchema>;
export type MfaVerifyDto = z.infer<typeof mfaVerifySchema>;
export type MfaDisableDto = z.infer<typeof mfaDisableSchema>;
