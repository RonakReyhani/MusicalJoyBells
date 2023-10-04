export interface IMusicalJoy {
  detectAndNotifyMe(): Promise<any>;
  playMusic(): Promise<any>;
  getRandomMusic(): Promise<void>;
}
