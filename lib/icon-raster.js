// Fixed pixels keep both browsers independent of installed fonts and font smoothing.
const GLYPHS = Object.freeze({
  '0': ['111','101','101','101','111'], '1': ['010','110','010','010','111'],
  '2': ['111','001','111','100','111'], '3': ['111','001','111','001','111'],
  '4': ['101','101','111','001','001'], '5': ['111','100','111','001','111'],
  '6': ['111','100','111','101','111'], '7': ['111','001','010','010','010'],
  '8': ['111','101','111','101','111'], '9': ['111','101','111','001','111'],
  '!': ['1','1','1','0','1'], '~': ['00000','01010','10100','00000','00000'],
  '…': ['00000','00000','00000','00000','10101'], '—': ['000','000','111','000','000'],
});
const WHITE = [255,255,255,255];
// Four columns per digit leave a full pixel between all three digits of 100.
// Seven rows per limit use the available height without squeezing the width.
const STACKED = Object.freeze({
  '0': ['0110','1001','1001','1001','1001','1001','0110'],
  '1': ['0010','0110','0010','0010','0010','0010','0111'],
  '2': ['0110','1001','0001','0010','0100','1000','1111'],
  '3': ['1110','0001','0001','0110','0001','0001','1110'],
  '4': ['1001','1001','1001','1111','0001','0001','0001'],
  '5': ['1111','1000','1000','1110','0001','0001','1110'],
  '6': ['0110','1000','1000','1110','1001','1001','0110'],
  '7': ['1111','0001','0001','0010','0010','0100','0100'],
  '8': ['0110','1001','1001','0110','1001','1001','0110'],
  '9': ['0110','1001','1001','0111','0001','0001','0110'],
});

export function iconRgba(label, color, size = 32) {
  if (!Number.isInteger(size) || size < 16 || size > 128) throw new RangeError('Invalid icon size');
  if (!/^#[\da-f]{6}$/i.test(color)) throw new TypeError('Invalid icon color');
  const dual = /^(100|\d{1,2})\|(100|\d{1,2})$/.exec(label);
  if (!dual && !/^(100|\d{1,2}|!|~|…|—)$/.test(label)) throw new TypeError('Invalid icon label');
  const logical = new Uint8ClampedArray(16 * 16 * 4);
  const coverage = new Float32Array(16 * 16);
  const bg = [...[1,3,5].map(i => parseInt(color.slice(i,i+2),16)),255];
  const rect = (x,y,w,h,ink) => {
    for (let py=Math.floor(y);py<Math.ceil(y+h);py++) for (let px=Math.floor(x);px<Math.ceil(x+w);px++) {
      if (ink === WHITE) {
        const area = Math.max(0,Math.min(px+1,x+w)-Math.max(px,x)) * Math.max(0,Math.min(py+1,y+h)-Math.max(py,y));
        coverage[py*16+px] = Math.min(1,coverage[py*16+px]+area);
      } else logical.set(ink,(py*16+px)*4);
    }
  };
  rect(2,0,12,16,bg); rect(1,1,14,14,bg); rect(0,2,16,12,bg);
  function stackedNumber(value, top) {
    let x = Math.floor((16-(value.length*5-1))/2);
    for (const digit of value) {
      const glyph = STACKED[digit];
      for (let y=0;y<7;y++) for (let col=0;col<4;col++) {
        if (glyph[y][col]==='1') rect(x+col,top+y,1,1,WHITE);
      }
      x += 5;
    }
  }
  function number(value, start, available) {
    const glyphs = [...value].map(c=>GLYPHS[c]);
    const gap = 1;
    const width = glyphs.reduce((sum,g)=>sum+g[0].length,0)+gap*(glyphs.length-1);
    const sx = Math.max(1,Math.min(3,Math.floor(14/width)));
    let x = start + Math.floor((available-width*sx)/2);
    for (const glyph of glyphs) {
      for (let y=0;y<5;y++) for (let col=0;col<glyph[y].length;col++) if (glyph[y][col]==='1') rect(x+col*sx,3+y*2,sx,2,WHITE);
      x += (glyph[0].length+gap)*sx;
    }
  }
  if (dual) {
    stackedNumber(dual[1],0); stackedNumber(dual[2],9);
  } else number(label,0,16);
  for (let i=0;i<coverage.length;i++) if (coverage[i]) {
    for (let channel=0;channel<3;channel++) logical[i*4+channel] = Math.round(logical[i*4+channel]*(1-coverage[i])+255*coverage[i]);
    logical[i*4+3] = 255;
  }
  // Nearest-neighbor expansion on exact pixel boundaries: no font dependency.
  const data = new Uint8ClampedArray(size*size*4);
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const source=(Math.floor(y*16/size)*16+Math.floor(x*16/size))*4;
    data.set(logical.subarray(source,source+4),(y*size+x)*4);
  }
  return {data,width:size,height:size};
}
