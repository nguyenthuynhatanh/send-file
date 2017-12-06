'use strict';

//tao id

//var meeting ; 
//var host =  HOST_ADDRESS;

//$(document).ready(function(){
//	meeting = new Meeting(host)
//	const localUserName = _myID;
//	console.log('Generated ID file: '+_myID)
//})
const ds = deepstream( 'wss://013.deepstreamhub.com?apiKey=d02f8752-7d26-4cf0-965a-90c21536410f' ).login(); // tao ket noi den deepstream\
const localUserName = ds.getUid(); // tao random user id
console.log('Generated ID file: '+localUserName)

// tao mot danh sach cac list , them ten nguoi su dung vao list ke ca minh
const users = ds.record.getList( 'users' );
const connections = {};
const input = $('input'); 


// lay thong tin trong text sau do gui di 
$('form').on('submit', ( e ) => { 
	e.preventDefault();
	var val = input.val();
	for( var username in connections ) {
		connections[ username ].send( val );
	}
	input.val('').focus();
});


// neu co nguoi dang ki thi moi xu ly signal
ds.event.subscribe( `rtc-signal/${localUserName}`, msg => {				// subcribe la nguoi nhan thong tin tu publisher
	if( connections[ msg.user ] ) {
		connections[ msg.user ].processSignal( msg.signal );
	}
});

users.addEntry( localUserName );

// tao ket noi 
users.subscribe( userNames => {					// su dung vong lap forEach lay tung userName
	userNames.forEach( userName => {   					// lay tung user so sanh
		if( connections[ userName ] ) return;			// kết nối đến userName đó được thiết lập thì bỏ qua 
		if( userName === localUserName ) return;		// neu la localUserName (la chinh no) thi bo qua 
		connections[ userName ] = new Connection( userName );//  neu chưa có kết nối thì mở kết nối mới 
	})

	// hủy kết nối
	for( var userName in connections ) {
		if( userNames.indexOf( userName ) === -1 ) { 		// indexOf tìm kiếm nếu không tìm thấy thì trả về giá trị là -1 
			connections[ userName ].destroy();				// hủy kết nối 
		}	
	}
});


const log = msg => {
	$( '.output' ).append( '<li>' + msg + '</li>' );
};

log( 'connecting to deepstreamHub' );
log( `this is user ${localUserName}` );


// class giống như 1 function đặc biệt  cũng phải định nghĩa , khai báo hàm . class gồm 2 phần : biểu thức class và khai báo lớp 
class Connection{		// khai báo class với tên Connection
	constructor( remoteUserName ) { 		// hàm khởi tạo : khởi tạo remoteUserName  
		log( `Opening connection to ${remoteUserName}` );	// hiển thị remoteUserName chính là userName tạo kết nối ở trên 

		this._remoteUserName = remoteUserName;
		this._isConnected = false;
		this._p2pConnection = new SimplePeer({
			initiator: localUserName > remoteUserName,
			trickle: false
		});
		this._p2pConnection.on( 'signal', this._onOutgoingSignal.bind( this ) );
		this._p2pConnection.on( 'error', this._onError.bind( this ) );
		this._p2pConnection.on( 'connect', this._onConnect.bind( this ) );
		//this._p2pConnection.on( 'close', this._onClose.bind( this ) );
		this._p2pConnection.on( 'data', this._onData.bind( this ) );
		setTimeout( this._checkConnected.bind( this ), 180000 );
	}
	processSignal( signal ) {
		this._p2pConnection.signal( signal );
	}

	send( msg ) {
		this._p2pConnection.send(msg);
	}

	destroy() {
		this._p2pConnection.destroy();
	}

	_onOutgoingSignal( signal ) {
		ds.event.emit( `rtc-signal/${this._remoteUserName}` , {
			user: localUserName,
			signal: signal 
		});
	}

	_onConnect() {
		this._isConnected = true;
		log( 'connected to ' + this._remoteUserName );
	}

	//_onClose() {
	//	log( `connection to ${this._remoteUserName} closed` );
	//	delete connections[ this._remoteUserName ];
	//	users.removeEntry( this._remoteUserName );
	//}

	_checkConnected() {
		if( !this._isConnected ) {
			this.destroy();
		}
	}

	_onData( data ) {
		log( `received message from ${this._remoteUserName}: <b>${data.toString()}</b>` );
	}

	_onError( error ) {
		log( `an error occured ${error.toString()}` );
	}
}
