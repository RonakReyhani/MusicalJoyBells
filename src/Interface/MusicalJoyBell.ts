export interface IMusicalJoy {
  getVideoAnalysis(record:{ kinesis: { data: string }}): Promise<{ statusCode: number; body: string; }>;
  informHost(visitors: string): Promise<void>;
}
