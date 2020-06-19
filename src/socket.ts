import * as http from 'http'
import socketio from 'socket.io';


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



