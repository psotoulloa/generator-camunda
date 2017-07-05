var chalk = require('chalk');
var Promise = require('promise');
var yosay = require('yosay');
var _ = require('lodash');

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
  /**
   * Return the path to file
   * @param {string} classDefinition
   */
function _get_class_file (classDefinition){
    return 'src/main/java/' + _.replace(classDefinition, /\./g, '/') + ".java";
}
/**
 * Add java delegate
 * @param {object} classOptions
 * @param {boolean} triggerMessage
 */
function _add_java_delegates(self,classOptions,triggerMessage){
  if(self.fs.exists(self.destinationPath(_get_class_file(classOptions.name))) && !self.onlyNews){
    if(!triggerMessage){
      self.javaDelegates.push(classOptions.name);
    }else{
      self.javaDelegatesThatEmitesMessages.push(classOptions.name);
    }

    return true;
  }
  if(!self.fs.exists(self.destinationPath(_get_class_file(classOptions.name)))){
    if(!triggerMessage){
      self.javaDelegates.push(classOptions.name);
    }else{
      self.javaDelegatesThatEmitesMessages.push(classOptions.name);
    }
    return true;
  }
  return false;
}
/**
 * Returns class name
 * eg:
 * "org.camunda.test.Class1" return ˝Class1"
 * @param {string} class_definition
 */
function _get_class_name (class_definition){
  var arr = class_definition.split(".");
  if( arr.length-1 >= 0 ){
    return arr[arr.length-1];
  }
  return null;
}
/**
 * Return the package
 * eg:
 * "org.camunda.test.Class1" return "org.camunda.test"
 * @param {string} class_definition
 */
function _get_class_package(class_definition){
  var arr = class_definition.split(".");
  arr.pop();
  return arr.join(".");
}
/**
 * Returns the process archive name
 */
function _get_process_archive(self){
  var arr = self.config.get('bpmFile').split("/");
  arr = arr[arr.length - 1].split(".");
  arr.pop();
  return arr.join(".");
}
/**
 * Agregar un formulario en base a un nodo
 * @param {Generator} self
 * @param {Document} node
 */
function _add_form(self,node){
  var inputs = [];
  var extensionElements = node.getElementsByTagName("bpmn:extensionElements");
  if(extensionElements.length>0){
    var camunda_properties = extensionElements[0].getElementsByTagName("camunda:properties");
    if(camunda_properties.length>0){
      var properties = camunda_properties[0].getElementsByTagName("camunda:property");
      for (var k=0;k<properties.length;k++){
        var name = properties[k].getAttribute("name");
        var value = properties[k].getAttribute("value");
        //Input text
        if( name.startsWith("text")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          inputs.push({
            type :"text",
            label: _.upperFirst(value),
            name : value,
            required: required
          });
        }
        //Input textarea
        else if( name.startsWith("textarea")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          inputs.push({
            type :"textarea",
            label: _.upperFirst(value),
            name : value,
            required: required
          });
        }
        //Input users
        else if( name.startsWith("users")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          name = _.replace(name,"*","");
          var arr = name.split(":");
          if(arr.length==2){
            inputs.push({
              type :"users",
              label: _.upperFirst(value),
              list :arr[1],
              name : value,
              required: required
            });
          }else{
            self.log(chalk.yellow("Warning : users without a list -> '"+name));
            continue;
          }
        }
        //Input list
        else if( name.startsWith("list")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          name = _.replace(name,"*","");
          var arr = name.split(":");
          if(arr.length==2){
            inputs.push({
              type :"list",
              label: _.upperFirst(value),
              list :arr[1],
              name : value,
              required: required
            });
          }else{
            self.log(chalk.yellow("Warning : list without a list -> '"+name));
            continue;
          }
        }
        //Input file
        else if( name.startsWith("file")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          name = _.replace(name,"*","");
          var arr = name.split(":");
          if(arr.length==2){
            inputs.push({
              type :"file",
              label: _.upperFirst(value),
              extensions :arr[1],
              name : value,
              required: required
            });
          }else{
            inputs.push({
              type :"file",
              extensions :"*",
              label: _.upperFirst(value),
              name : value,
              required: required
            });
          }
        }
        //Input boolean
        else if( name.startsWith("boolean")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          inputs.push({
            type :"boolean",
            name : value,
            label: _.upperFirst(value),
            required: required
          });
        }
        //Input date
        else if( name.startsWith("date")){
          var required = false;
          if(name.endsWith("*")){
            required = true;
          }
          inputs.push({
            type :"date",
            label: _.upperFirst(value),
            name : value,
            required: required
          });
        }
        else{
          self.log(chalk.yellow("Warning : property type unknown '"+name));
          continue;
        }
      }
    }
  }
  var formKey = node.getAttribute("camunda:formKey");
  if(self.onlyNewsForms){
    if(self.fs.exists(self.destinationPath("src/main/webapp/forms/"+_get_process_archive(self)+"/"+_.camelCase(node.getAttribute("name"))+".html"))){
      return;
    }
  }
  if(formKey == ""){
    self.forms.push({
      formKey : "embedded:app:forms/"+_get_process_archive(self)+"/"+_.camelCase(node.getAttribute("name"))+".html",
      path : "src/main/webapp/forms/"+_get_process_archive(self)+"/"+_.camelCase(node.getAttribute("name"))+".html",
      node : node,
      inputs : inputs
    });
  }else{
    var arr = formKey.split(":app:");
    if(arr.length == 2){
      self.forms.push({
        formKey : formKey,
        path : "src/main/webapp/"+arr[1],
        node : node,
        inputs : inputs
      });
    }else{
      self.log(chalk.red("Error : formKey mal formed -> '"+formKey));
    }
  }
}

/**
 * This method create the forms and atach them to the bpmn
 */
function _createForms(self){
  var formsChoices = [];
  var formsChoicesHashs = {};
  for (var i =0;i<self.forms.length;i++){
    var form = self.forms[i];
    formsChoicesHashs[form.formKey] = form;
    formsChoices.push({
      name: form.formKey,
      value : form.formKey,
      checked: false
    });
  }
  if(formsChoices.length>0){
    var done = self.async();
    self.prompt([
    {
      type : 'checkbox',
      name : 'forms',
      message : 'Which of these forms do you want to create?:',
      choices : formsChoices
    }]).then(function(answers){
      for(var i=0; i<answers['forms'].length ; i++){
        var form = formsChoicesHashs[answers['forms'][i]];
        form.node.setAttribute("camunda:formKey",form.formKey);
        for(var j=0;j<form.inputs.length;j++){
          var input = form.inputs[j];
          if(input.type == 'users'){
            var extensionElements = form.node.getElementsByTagName("bpmn:extensionElements");
            var extensionElement = null;
            if(extensionElements.length==0){
              extensionElement = new DOMParser().parseFromString("<bpmn:extensionElements></bpmn:extensionElements>");
              form.node.appendChild(extensionElement);
            }else{
              extensionElement = extensionElements[0];
            }
            var package_user = "org.camunda.groups";
            var class_name = _.upperFirst(input.list);
            var group = input.list;
            var executionListener = self.doc.createElement("camunda:executionListener");
            executionListener.setAttribute("class",package_user+'.'+class_name);
            executionListener.setAttribute("event","start");

            var executionListeners = extensionElement.getElementsByTagName("camunda:executionListener");
            var found = false;
            for(var k=0;k<executionListeners.length;k++){
              if(executionListeners[k].getAttribute("class")==(package_user+'.'+class_name)){
                found = true;
              }
            }
            if(!found){
              extensionElement.appendChild(executionListener);
            }
            /**
            <camunda:executionListener class="org.camunda.groups.Developers" event="start" xmlns:camunda=""/>
            <camunda:executionListener class="org.camunda.groups.Qas" event="start"/>
              */
            self.fs.copyTpl(
              self.templatePath('users.java'),
              self.destinationPath("src/main/java/org/camunda/groups/"+class_name+".java"),
              {
                package_user: package_user,
                class_name: class_name,
                group: group,
                variable_name : input.list
              }
            );

          }
        }
        self.fs.copyTpl(
          self.templatePath('form.html'),
          self.destinationPath(form.path),
          {
            inputs: form.inputs,
          }
        );
      }
      done();
    });
  }
}
//Validate that all tags in a node have a name
module.exports = {
  "nameValidator" : __nameValidator,
  "get_class_file" : _get_class_file,
  "add_java_delegates" : _add_java_delegates,
  "get_class_name" : _get_class_name,
  "get_class_package" : _get_class_package,
  "get_process_archive" : _get_process_archive,
  "add_form" : _add_form,
  "createForms" : _createForms,
}
