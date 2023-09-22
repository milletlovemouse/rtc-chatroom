/**
 * // YYYY-MM-DD HH:mm:ss
 * @param {Date} dateObj
 * @param {{
*    language: 'en' | 'zh_cn',
*    format: String
*  }} options
*/

type Language = "en" | "zh_cn";
type Format = "d" | "dd" | "ddd"
export type Options = {
 language?: Language;
 format?: Format;
}

type DateInfo = ReturnType<typeof getDateInfo>

export function formatDate(dateObj: Date, options: Options = {}) {
 const { language = "en", format = "ddd" } = options;
 const dateInfo = getDateInfo(dateObj);
 const { fullYear, day } = dateInfo;
 const dayName = getDayName(day, language, format);
 const [month, date, hours, minutes, seconds] = fillZero(dateInfo);
 return {
   ...dateInfo,
   dayName,
   YYYYMMDDHHmmss: `${fullYear}-${month}-${date} ${hours}:${minutes}:${seconds}`,
   YYYYMMDD: `${fullYear}-${month}-${date}`,
   MMDD: `${month}-${date}`,
   HHmmss: `${hours}:${minutes}:${seconds}`
 };
}

function getDateInfo(date: Date) {
 date = new Date(date);
 return {
   date: date.getDate(),
   day: date.getDay(),
   fullYear: date.getFullYear(),
   hours: date.getHours(),
   milliseconds: date.getMilliseconds(),
   minutes: date.getMinutes(),
   month: date.getMonth() + 1,
   seconds: date.getSeconds(),
   time: date.getTime(),
   timezoneOffset: date.getTimezoneOffset(),
   UTCDate: date.getUTCDate(),
   UTCDay: date.getUTCDay(),
   UTCFullYear: date.getUTCFullYear(),
   UTCHours: date.getUTCHours(),
   UTCMilliseconds: date.getUTCMilliseconds(),
   UTCMinutese: date.getUTCMinutes(),
   UTCMonth: date.getUTCMonth(),
   UTCSecondse: date.getUTCSeconds(),
  //  year: date.getYear()
 };
}

function getDayName(day: number, language: Language, format: Format) {
 const dayName = {
   en: {
     full: [
       "Monday",
       "Tuesday",
       "Wednesday",
       "Thursday",
       "Friday",
       "Saturday",
       "Sunday"
     ],
     d: ["S", "M", "T", "W", "T", "F", "S"],
     dd: ["Sa", "Mo", "Tu", "We", "Th", "Fr", "Su"],
     ddd: ["Sat", "Mon", "Tue", "Wed", "Thu", "Fri", "Sun"]
   },
   zh_cn: {
     d: ["一", "二", "三", "四", "五", "六", "日"],
     dd: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
     ddd: [
       "星期一",
       "星期二",
       "星期三",
       "星期四",
       "星期五",
       "星期六",
       "星期日"
     ]
   }
 };
 return dayName[language][format][day];
}

function fillZero(dateInfo: DateInfo): (number | string)[] {
 return ["month", "date", "hours", "minutes", "seconds"].map((key) => {
   const date = dateInfo[key];
   return date < 10 ? "0" + date : date;
 });
}
