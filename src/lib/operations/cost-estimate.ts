export const costFields=[
 ['materialMg','Material used (g)',1000000000000,'grams'],['pricePerKgPaise','Material price INR/kg',9000000000000,'money'],
 ['wasteBps','Additional waste %',10000,'percent'],['watts','Average power W',1000000,'integer'],['minutes','Machine time minutes',525600,'integer'],
 ['electricityPaisePerKwh','Electricity INR/kWh',9000000000000,'money'],['laborMinutes','Labor minutes',525600,'integer'],
 ['laborPaisePerHour','Labor INR/hour',9000000000000,'money'],['overheadPaise','Other overhead INR',9000000000000,'money'],
 ['marginBps','Target profit margin %',9900,'percent'],
] as const;
export type CostInputs=Record<typeof costFields[number][0],number>;
export type CostResult={materialPaise:number;electricityPaise:number;laborPaise:number;basePaise:number;suggestedPaise:number;profitPaise:number};
export function exactMoney(value:string|number){const s=String(value);if(!/^-?\d+$/.test(s))throw Error('Invalid paise value.');const n=BigInt(s),negative=n<BigInt(0),a=negative?-n:n;return `INR ${negative?'-':''}${a/BigInt(100)}.${String(a%BigInt(100)).padStart(2,'0')}`;}
export function parseGrams(value:string){if(!/^\d+(\.\d{1,3})?$/.test(value))throw Error('Use grams with at most three decimal places.');const [whole,fraction='']=value.split('.');const n=BigInt(whole)*BigInt(1000)+BigInt(fraction.padEnd(3,'0'));if(n>BigInt(1000000000000))throw Error('Quantity exceeds the supported range.');return Number(n);}
/** Internal draft estimate only. Components round up to whole paise; no rate defaults. */
export function calculateCost(p:CostInputs):CostResult{
 if(!p||Object.keys(p).some(k=>!costFields.some(f=>f[0]===k)))throw Error('Unsupported cost field.');
 for(const [key,,max] of costFields)if(!Number.isSafeInteger(p[key])||p[key]<0||p[key]>max)throw Error('Enter every cost field within its supported range.');
 const n=(k:keyof CostInputs)=>BigInt(p[k]),ceil=(a:bigint,b:bigint)=>(a+b-BigInt(1))/b;
 const material=ceil(n('materialMg')*n('pricePerKgPaise')*(BigInt(10000)+n('wasteBps')),BigInt(10000000000));
 const electricity=ceil(n('watts')*n('minutes')*n('electricityPaisePerKwh'),BigInt(60000));
 const labor=ceil(n('laborMinutes')*n('laborPaisePerHour'),BigInt(60)),base=material+electricity+labor+n('overheadPaise');
 const suggested=ceil(base*BigInt(10000),BigInt(10000)-n('marginBps'));if(suggested>BigInt(9000000000000))throw Error('Estimate exceeds the supported range.');
 return {materialPaise:Number(material),electricityPaise:Number(electricity),laborPaise:Number(labor),basePaise:Number(base),suggestedPaise:Number(suggested),profitPaise:Number(suggested-base)};
}
