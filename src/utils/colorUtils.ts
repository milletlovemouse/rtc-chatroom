export function colorToHalfTransparent(color: string, opacity: number) {
  opacity = Math.max(0, Math.min(1, opacity));
  // 使用正则表达式提取颜色的红、绿、蓝分量
  const match = 
    color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/i) ||
    color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  
  if (match) {
    const radix = color.indexOf('rgb') === 0 ? 10 : 16;
    const red = parseInt(match[1], radix);
    const green = parseInt(match[2], radix);
    const blue = parseInt(match[3], radix);
    
    // 创建半透明颜色
    const halfTransparentColor = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
    
    return halfTransparentColor;
  } else {
    // 如果颜色格式不匹配，返回一个默认值或者抛出错误
    console.error(
      '[colorToHalfTransparent] color value format is incorrect.',
    )
    return 'rgba(0, 0, 0, 0)';
  }
}
