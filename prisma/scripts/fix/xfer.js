const{PrismaClient}=require("@prisma/client");
const p=new PrismaClient();
const T=(process.env.T||"").split(",");
async function m(){
const a=await p.user.findFirst({where:{email:"admin@go4it.live"}});
const o=await p.user.findFirst({where:{email:"owenmarr@umich.edu"}});
if(!a||!o){console.log("Missing user",!!a,!!o);return;}
console.log(a.id,"->",o.id);
for(const t of T){
try{const r=await p.$executeRawUnsafe('UPDATE "'+t+'" SET "userId"=? WHERE "userId"=?',o.id,a.id);console.log(t+":",r);}
catch(e){console.log(t+": ERR",e.message.slice(0,80));}
}console.log("OK");}
m().finally(()=>p.$disconnect());
