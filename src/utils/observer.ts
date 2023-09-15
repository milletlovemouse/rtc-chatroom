export default function observer<
  T extends Record<string, any>,
  K extends keyof T
>(subject: T, key: K, callback: (value: T[K]) => void){
  Object.defineProperty(subject, key, {
    get: () => subject[key],
    set: (value) => {
      subject[key] = value;
      callback(value);
    }
  })
}