import * as http from 'http'
import socketio from 'socket.io';

//TODO: app socket io. Client will connect to socket server. Then socket will emmit event update for each tweet when something happens 
//with this tweet. On client side I will subcscribe on tweet level each tweet to listen for update. When tweet is unmounted I will
//unsubscribe it, shoul work I think....

//i can listen for join-room event (on client socket.emit('join-room' , roomName or RoomId and socketId); on server socket.on("join-room", cb), 
//then join client to room. And romm name is for example tweetId. Then when smth happens with tweet i send updated tweet data to 
//all subscribed to this room

// io.sockets.on('connection', function(socket) {
//    socket.on('join', function(room,) {
//    socket.join(room);
//    });
// });

// io.to('some room').emit('update', {tweet: updatedTweet});

//to get some socket by id:
//io.connected[socketId] or ?io.sockets.connected[socketId]
//============================================================


const setUpSocketIo = (server: http.Server) => {
   const io = socketio(server);

   io.sockets.on('connection', function(socket) {
      console.log('somebody connected through socket')
      socket.on('subscribe_to_tweet_update', function(roomId: number | string) {
         // console.log('about to join ', roomId)
         socket.join(roomId.toString());
      });
      socket.on('unsubscribe_to_tweet_update', function(roomId: number | string) {
         // console.log('about to leave ', roomId)
         socket.leave(roomId.toString());
      });
      socket.on('subscribe_to_user_update', function(roomId: string) {
         socket.join(roomId);
      });
      socket.on('unsubscribe_to_user_update', function(roomId: string) {
         socket.leave(roomId);
      });
      socket.on('disconnect', (reason)=>console.log('somebody disconnected from socket, reason: ', reason))
   });
   return io
}

export default setUpSocketIo



