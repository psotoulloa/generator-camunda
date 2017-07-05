'use strict';
/**
 * @author Patricio Soto
 */
var Generator = require('yeoman-generator');
var beautify = require('gulp-beautify');
var chalk = require('chalk');
var yosay = require('yosay');
var _ = require('lodash');
var fs = require('fs');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var serializer = new XMLSerializer();
var utils = require('../utils');
var beautify = require('gulp-beautify');
var gulpFilter = require('gulp-filter');
var htmlc = require('gulp-html');
var path = require('path');
module.exports = class extends Generator {



  /**
   * Constructor for the generator
   * @param {object} args
   * @param {object} opts
   */
  constructor(args, opts) {
    super(args, opts);
    this.javaDelegates = [];
    this.javaDelegatesThatEmitesMessages = [];
    this.classNodes = {};
    this.doc = null;
    this.elementid = args[0];
    this.sourceRoot(path.join(__dirname,'..','..','templates'));
  }

  /**
   * This method read the camunda bpmn file, and maps the classes to be added
   * Also it makes a series of validations and modify the dom
   */
  configuring() {
    var self = this;
    var done = this.async();
    var error = false;
    var file = null;
    if(self.fs.exists(self.destinationPath("src/main/resources/"+self.config.get('bpmFile')) )){
      file = self.destinationPath("src/main/resources/"+self.config.get('bpmFile'));
    }else{
      file = self.destinationPath(self.config.get('bpmFile'));
    }
    fs.readFile(file, 'utf8', function (err, data) {
      if(err){
        self.log(chalk.red("File doesn't exist"));
        return ;
      }
      var doc = new DOMParser().parseFromString(data);
      self.doc = doc;
      var processes = doc.getElementsByTagName("bpmn:process");
      var element = doc.getElementById(self.elementid);

      if(element == null){
        self.log(chalk.red("Element doesn't exist"));
        return ;
      }
      // IntermediateThrowEvent
      if(element.tagName == 'bpmn:intermediateThrowEvent'){
        var intermediateThrowEvent = element;
        var camunda_class = intermediateThrowEvent.getAttribute('camunda:class');
        var name = intermediateThrowEvent.getAttribute('name');
        var id = intermediateThrowEvent.getAttribute('id');
        var nodeOption = null;
        if(name == ''){
          self.log(chalk.red("Error : Intermediate Throw Event '"+id+"' whit no name "));
          error = true;
        }
        if(camunda_class == ''){
          nodeOption = {
            name: self.config.get("processPackage")+ ".intermediatethrowevents."+ _.upperFirst(_.camelCase(name)),
            value : self.config.get("processPackage")+ ".intermediatethrowevents."+ _.upperFirst(_.camelCase(name)),
            checked: true
          };
        }else{
          nodeOption = {
            name: camunda_class,
            value : camunda_class,
            checked: true
          };
        }
        if(utils.add_java_delegates(self,nodeOption,true) ){
          self.classNodes[nodeOption.name] = intermediateThrowEvent;
        }
      }

      //Service task

      if(element.tagName == 'bpmn:serviceTask'){
        var serviceTask = element;
        var name = serviceTask.getAttribute('name');
        var camunda_class = serviceTask.getAttribute('camunda:class');
        var nodeOption = null;

        var id = serviceTask.getAttribute('id');
        if(name == ''){
          self.log(chalk.red("Error : Service task '"+id+"' whit no name "));
          error = true;
        }
        if(camunda_class == ''){
          nodeOption = {
            name: self.config.get("processPackage")+ ".servicetask." + _.upperFirst(_.camelCase(name)),
            value : self.config.get("processPackage")+ ".servicetask." + _.upperFirst(_.camelCase(name)),
            checked: true
          };
        }else{
          nodeOption = {
            name: camunda_class,
            value : camunda_class,
            checked: true
          };
        }
        if(utils.add_java_delegates(self,nodeOption,false) ){
          self.classNodes[nodeOption.name] = serviceTask;
        }
      }

      //Send task

      if(element.tagName == 'bpmn:sendTask'){
        var sendTask = element;
        var camunda_class = sendTask.getAttribute('camunda:class');
        var name = sendTask.getAttribute('name');
        var id = sendTask.getAttribute('id');
        var nodeOption = null;

        if(name == ''){
          self.log(chalk.red("Error : Send task '"+id+"' whit no name "));
          error = true;
        }
        if(camunda_class == ''){
          nodeOption = {
            name: self.config.get("processPackage")+ ".sendtask." + _.upperFirst(_.camelCase(name)),
            value : self.config.get("processPackage")+ ".sendtask." + _.upperFirst(_.camelCase(name)),
            checked: true
          };
        }else{
          nodeOption = {
            name: camunda_class,
            value : camunda_class,
            checked: true
          };
        }
        if(utils.add_java_delegates(self,nodeOption,true) ){
          self.classNodes[nodeOption.name] = sendTask;
        }
      }

      if(!error){
        done();
      }else{
        self.log(yosay( chalk.yellow('Sorry, resolve this issue and try again ') ));
      }
    });
  }

  /**
   * This method create the Java class
   */
  createClases(){
    var self = this;
    //Simple Java Delegates
    for (var i = 0; i < this.javaDelegates.length;i++){
      this.classNodes[this.javaDelegates[i]].setAttribute("camunda:class",answers['javaDelegates'][i]);
      this.fs.copyTpl(
        this.templatePath('java_delegates.java'),
        this.destinationPath(utils.get_class_file(answers['javaDelegates'][i])),
        {
          delegate_package : utils.get_class_package(answers['javaDelegates'][i]) ,
          delegate_class_name : self._get_class_name(answers['javaDelegates'][i]) ,
        }
      );
    }
    // Java Delegates That Emites Messages
    for (var i = 0; i< this.javaDelegatesThatEmitesMessages.length;i++){
      var class_name = this.javaDelegatesThatEmitesMessages[i];
      var node = this.classNodes[class_name];
      if (node.tagName == 'bpmn:intermediateThrowEvent'){
        var messageEventDefinitions = node.getElementsByTagName("bpmn:messageEventDefinition");
        messageEventDefinitions[0].setAttribute("camunda:class",class_name);
      }else{
        node.setAttribute("camunda:class",class_name);
      }
      var node = this.classNodes[class_name];
      var node_id = node.getAttribute("id");
      var collaboration = self.doc.getElementsByTagName('bpmn:collaboration');
      var messageFlows = collaboration[0].getElementsByTagName("bpmn:messageFlow");
      var message_destination_name = "";
      var is_start_event = false;
      var variables = [];
      var id_instancia_a_ejecutar = "";

      //Search and verify target references
      for (var j= 0; j<messageFlows.length ; j++){
        if(messageFlows[j].getAttribute('sourceRef') == node_id){
          var target = self.doc.getElementById(messageFlows[j].getAttribute("targetRef"));
          if (target.tagName == 'bpmn:startEvent'){
            is_start_event = true;
          }
          var messagesEventDefinitions =target.getElementsByTagName("bpmn:messageEventDefinition");
          if (messagesEventDefinitions != undefined && messagesEventDefinitions[0].getAttribute("messageRef") != ""){
            message_destination_name = self.doc.getElementById(messagesEventDefinitions[0].getAttribute("messageRef")).getAttribute("name");
          }else{
            this.log(chalk.red("Error : the event/activity "+target.getAttribute("name")+" doesn't have a message definition"));
            self.log(yosay( chalk.yellow('Sorry, resolve this issue and try again ') ));
            return;
          }
          id_instancia_a_ejecutar = "INSTANCE_ID_" + target.parentNode.getAttribute("name");
        }
      }
      // Processes archives
      var properties = node.getElementsByTagName("camunda:property");
      for (var j = 0;j<properties.length; j++){
        variables.push(properties[j].getAttribute("value"));
      }
      //If no destination message, throw error
      if(message_destination_name == ""){
        this.log(chalk.red("Error : you must point your message "+ node.getAttribute("name")+" to some event message"));
        self.log(yosay( chalk.yellow('Sorry, resolve this issue and try again ') ));
        return;
      }
      //Otherwise we copy the processes.xml
      this.fs.copyTpl(
        this.templatePath('java_delegates_throw_message.java'),
        this.destinationPath(utils.get_class_file(class_name)),
        {
          delegate_package : utils.get_class_package(class_name) ,
          delegate_class_name : utils.get_class_name(class_name) ,
          variables : variables,
          message_destination_name : message_destination_name,
          id_instancia_a_ejecutar : id_instancia_a_ejecutar,
          is_start_event : is_start_event,
          process_id_name : id_instancia_a_ejecutar
        }
      );
    }

  }

  /**
   * This method write the main files for a camunda project using MVN
   */
  writing(){
    //BPMN FILE
    var xml_bpmn = serializer.serializeToString(this.doc);
    this.fs.copyTpl(
      this.templatePath('blank_file.txt'),
      this.destinationPath(this.destinationPath("src/main/resources/"+this.config.get('bpmFile'))),
      {
        content: xml_bpmn
      }
    );
  }

  conflicts() {

  }

  install() {

  }

  end() {

  }
}
