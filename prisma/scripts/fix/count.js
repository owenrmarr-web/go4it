const{PrismaClient}=require("@prisma/client");
const p=new PrismaClient();
async function m(){
const models=Object.keys(p).filter(k=>!k.startsWith('$')&&!k.startsWith('_'));
for(const m of models){
try{const c=await p[m].count();if(c>0)console.log(m+":"+c);}catch{}
}
const users=await p.user.findMany({select:{id:true,email:true,name:true}});
console.log("USERS:"+JSON.stringify(users));
}
m().finally(()=>p.$disconnect());
