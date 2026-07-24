/* ── DATA ─────────────────────────────────────────────────── */

const driversData = [
  {id:1,name:'Gustavo García',vehicle:'Unidad 014',status:'active'},
  {id:2,name:'Lucía Martínez',vehicle:'Unidad 027',status:'active'},
  {id:3,name:'Martín López',vehicle:'Unidad 051',status:'active'},
  {id:4,name:'Ana Fernández',vehicle:'Unidad 066',status:'active'},
  {id:5,name:'José Rodríguez',vehicle:'Unidad 083',status:'active'},
];

const sucursalesData = [
  {id:1,name:'Sucursal Centro',address:'Mitre 123, Salta Capital',lat:-24.7865,lng:-65.4120},
  {id:2,name:'Sucursal Norte',address:'Prat 456, Barrio Norte',lat:-24.7658,lng:-65.4195},
  {id:3,name:'Sucursal Sur',address:'Castañares 789, La Merced',lat:-24.7934,lng:-65.4212},
];

const deliveryData = [
  {h:'06',v:42,sla:40},{h:'07',v:38,sla:40},{h:'08',v:71,sla:40},
  {h:'09',v:86,sla:40},{h:'10',v:91,sla:40},{h:'11',v:68,sla:40},
  {h:'12',v:55,sla:40},{h:'13',v:79,sla:40},{h:'14',v:62,sla:40},
];

const fleetData = [
  {icon:'🚚',name:'PMB711',route:'Toyota Hilux',driver:'Sin asignar',status:'active',region:'salta'},
  {icon:'🚚',name:'AE240BF',route:'Toyota Hilux Cabina Simple 4x4',driver:'Sin asignar',status:'active',region:'salta'},
  {icon:'🚚',name:'AD642XY',route:'Toyota Hilux',driver:'Sin asignar',status:'active',region:'salta'},
  {icon:'🚚',name:'AE240BG',route:'Toyota Hiace',driver:'Sin asignar',status:'active',region:'salta'},
  {icon:'🚛',name:'JZE463',route:'Camión MB 710',driver:'Sin asignar',status:'active',region:'salta'},
  {icon:'🚛',name:'AC088HY',route:'Camión MB 1016',driver:'Sin asignar',status:'active',region:'salta'},
  {icon:'🚛',name:'LHM734',route:'Camión MB 1720',driver:'Sin asignar',status:'active',region:'salta'},
  {icon:'🚐',name:'AF611OH',route:'Sprinter',driver:'Sin asignar',status:'active',region:'salta'},
  {icon:'🚛',name:'AG798MZ',route:'Camión MB 1016',driver:'Sin asignar',status:'active',region:'salta'},
];

const inventoryData = [
  {sku:'MAT-0042',stock:8,demand:120,state:'critico'},
  {sku:'PAK-1193',stock:31,demand:85,state:'bajo'},
  {sku:'FRG-0017',stock:4,demand:60,state:'critico'},
  {sku:'ELE-2250',stock:145,demand:90,state:'ok'},
  {sku:'LAB-0831',stock:22,demand:75,state:'bajo'},
];

const ordersData = [
  {id:'ORD-8821',dest:'Barrio Norte',eta:'14:30',issue:'Retraso de turnos',risk:'high',driver:'Gustavo García',branch:'Sucursal Norte',region:'salta',lat:-24.7780,lng:-65.4130,vehicle:'Unidad 014'},
  {id:'ORD-9104',dest:'Centro',eta:'16:00',issue:'Temperatura crítica',risk:'high',driver:'Lucía Martínez',branch:'Sucursal Centro',region:'salta',lat:-24.7830,lng:-65.4220,vehicle:'Unidad 027'},
  {id:'ORD-7753',dest:'General Güemes',eta:'13:45',issue:'Ventana de entrega ajustada',risk:'medium',driver:'Gustavo García',branch:'Sucursal Norte',region:'salta',lat:-24.7845,lng:-65.4320,vehicle:'Unidad 014'},
  {id:'ORD-8390',dest:'Villa Mitre',eta:'17:15',issue:'Chofer sin confirmar',risk:'medium',driver:'Martín López',branch:'Sucursal Centro',region:'salta',lat:-24.7800,lng:-65.4275,vehicle:'Unidad 051'},
  {id:'ORD-9210',dest:'La Merced',eta:'12:50',issue:'Dirección incompleta',risk:'medium',driver:'Ana Fernández',branch:'Sucursal Sur',region:'salta',lat:-24.7890,lng:-65.3970,vehicle:'Unidad 066'},
];
