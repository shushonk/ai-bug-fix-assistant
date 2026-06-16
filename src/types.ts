export interface AppFile {
  name: string;
  content: string;
  language: string;
}

export interface DebugRequest {
  code: string;
  errorLogs: string;
  language: string;
  category: string;
  customContext: string;
  expectedBehavior: string;
  actualBehavior: string;
  stepsToReproduce: string;
  modelName: string;
  beginnerMode: boolean;
  securityScan: boolean;
  performanceScan: boolean;
}

export interface PresetBug {
  id: string;
  title: string;
  language: string;
  description: string;
  code: string;
  errorLogs: string;
  category: string;
  customContext: string;
  expectedBehavior: string;
  actualBehavior: string;
  stepsToReproduce: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  title: string;
  language: string;
  bugCategory: string;
  severity: string;
  input: {
    sourceCode: string;
    errorLog: string;
    environmentContext: string;
    expectedBehavior: string;
    actualBehavior: string;
    stepsToReproduce: string;
    beginnerMode?: boolean;
    securityScan?: boolean;
    performanceScan?: boolean;
  };
  output: string;
  model: string;
}
