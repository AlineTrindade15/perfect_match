var mongoose = require("mongoose");

var messageSchema = mongoose.Schema({
	text: String,
	createdAt: {type: Date, default: Date.now},
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String,
		profilePicture: String
	}
});

module.exports = mongoose.model("Message", messageSchema);