export interface CreateOneClickDemoResult {
  demoId: string;
  email: string;
  buildJob: { jobId: string };
}

export interface OneClickDemoBuildJobState {
  id: string;
  state: string;
  isCompleted: boolean;
  isRunning: boolean;
  isWaiting: boolean;
  isFailed: boolean;
}

export const ONE_CLICK_DEMO_ERRORS = {
  DEMO_DISABLED: 'ONE_CLICK_DEMO_DISABLED',
  DEMO_NOT_FOUND: 'ONE_CLICK_DEMO_NOT_FOUND',
};
