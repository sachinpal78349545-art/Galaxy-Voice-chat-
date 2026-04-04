import { db } from "./firebase";
import { doc, updateDoc, onSnapshot, getDoc, setDoc } from "firebase/firestore";

// init seats once
export async function initSeats(roomId:string){
  const ref = doc(db,"rooms",roomId);
  const snap = await getDoc(ref);

  if(!snap.exists()){
    await setDoc(ref,{
      seats: Array(10).fill(null)
    });
  }
}

// take seat
export async function takeSeat(roomId:string,index:number,userId:string){
  await updateDoc(doc(db,"rooms",roomId),{
    [`seats.${index}`]: userId
  });
}

// leave seat
export async function leaveSeat(roomId:string,index:number){
  await updateDoc(doc(db,"rooms",roomId),{
    [`seats.${index}`]: null
  });
}

// listen
export function listenSeats(roomId:string,cb:any){
  return onSnapshot(doc(db,"rooms",roomId),(snap)=>{
    cb(snap.data()?.seats || []);
  });
}