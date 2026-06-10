// © 2026 Bigfin
import { z } from 'zod';

export const employeeSchema = z.object({
  fullName: z.string().trim().min(1),
  position: z.string().optional(),
  employmentType: z.enum(['staff', 'gph', 'npd', 'ip']),
  defaultSalary: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
  note: z.string().optional(),
});
export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const payrollRunSchema = z.object({
  periodMonth: z.string().min(1),
  payDate: z.string().min(1),
  note: z.string().optional(),
});
export type PayrollRunFormValues = z.infer<typeof payrollRunSchema>;

export const payrollSettingsSchema = z.object({
  ndflRate: z.coerce.number().min(0).max(100),
  contribMode: z.enum(['standard', 'msp']),
  contribRate: z.coerce.number().min(0).max(100),
  mspRate: z.coerce.number().min(0).max(100),
  mspThreshold: z.coerce.number().min(0),
});
export type PayrollSettingsFormValues = z.infer<typeof payrollSettingsSchema>;
