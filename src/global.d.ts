interface XSSWhiteList {
  whiteList: XSS.IWhiteList;
}

declare let xssWhiteList: XSSWhiteList;

declare module 'xss/lib/default.js' {
  export = xssWhiteList;
}
