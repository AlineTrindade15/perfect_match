var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
	username: String,
	email: String,
	password: String,
	firstName: String,
	lastName: String,
	gender: String,
	birth: Date,
	age: String,
	location: String,
	profilePicture: String,
	picture1: String,
	picture2: String,
	picture3: String,
	profession: String,
	orientation: String,
	height: String,
	smoke: String,
	children: String,
	aboutMe: String,
	whatIDo: String,
	whatILike: String,
	isAdmin: Boolean,
  	messages: [
  		{
  			type: mongoose.Schema.Types.ObjectId,
  			ref: "Message"
  		}
  	]
});

//Passport-Local Mongoose will add a username, hash and salt field to store the username, the hashed password and the salt value.
//Additionally Passport-Local Mongoose adds some methods to your Schema.
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User",UserSchema);
