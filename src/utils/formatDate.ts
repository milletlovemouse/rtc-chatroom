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
 const {month, date, hours, minutes, seconds} = fillZero(dateInfo);
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

function fillZero(dateInfo: DateInfo) {
 return ["month", "date", "hours", "minutes", "seconds"].reduce((res, key) => {
   const date = dateInfo[key];
   return {
    ...res,
    [key]: date < 10 ? "0" + date : date as unknown as number
   }
 }, {} as Record<"month" | "date" | "hours" | "minutes" | "seconds", number>);
}

/**
 * 将毫秒时间转为天:时:分:秒的格式
 */
export function formatTime(time: number): string {
  const dateTime = new Date(time);
  const dateInfo = getDateInfo(dateTime);
  dateInfo.fullYear -= 1970
  dateInfo.month -= 1;
  dateInfo.date -= 1;
  dateInfo.hours -= 8;
  let {month, date, hours, minutes, seconds} = fillZero(dateInfo);
  
  if (dateInfo.fullYear > 0) {
    return `${dateInfo.fullYear}年${month}月${date}天 ${hours}:${minutes}:${seconds}`;
  } else if (month > 0) {
    return `${month}月${date}天 ${hours}:${minutes}:${seconds}`;
  } else if (date > 0) {
    return `${date}天 ${hours}:${minutes}:${seconds}`
  } else if (hours > 0) {
    return `${hours}:${minutes}:${seconds}`
  } else {
    return `${minutes}:${seconds}`
  }
}
