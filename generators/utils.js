var chalk = require('chalk');
var Promise = require('promise');
function __nameValidator(generator,node,tag_name){
  var error = false;
  var tags = node.getElementsByTagName(tag_name);
  for (var j = 0; j < tags.length; j++) {
    var tag = tags[j];
    var name = tag.getAttribute('name');
    var id = tag.getAttribute('id');
    if(name == ''){
      generator.log(chalk.red("User task '"+id+"' whit no name "));
      error = true;
    }
  }
  return error;
}

//Validate that all tags in a node have a name
module.exports = {
  "nameValidator" : __nameValidator
}
