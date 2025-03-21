export const getAge = (birthday) => {
 const birthDate = new Date(birthday);
 const today = new Date();
 let age = today.getFullYear() - birthDate.getFullYear();
 if (
   today.getMonth() < birthDate.getMonth() ||
   (today.getMonth() === birthDate.getMonth() &&
     today.getDate() < birthDate.getDate())
 ) {
   return age--;
 }
 return age;
};

export const blurhash =
 "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

export const getRoomId = (userId1, userId2) => {
 const sortedIds = [userId1, userId2].sort();
 const roomId = sortedIds.join("_");
 return roomId;
};

export const formatDate = (date) => {
 let day = date.getDate();
 let monthNames = [
   "Jan",
   "Feb",
   "Mar",
   "Apr",
   "May",
   "Jun",
   "Jul",
   "Aug",
   "Sep",
   "Oct",
   "Nov",
   "Dec",
 ];
 let month = monthNames[date.getMonth()];

 let formattedDate = day + " " + month;
 return formattedDate;
};
