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
    this.javaDelegatesThatEmitsMessages = [];
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
      self.log(yosay( chalk.yellow(element.tagName) ));
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
      if(element.tagName == 'bpmn:endEvent'){
        var endEvent = element;
        var messageEventDefinitions = endEvent.getElementsByTagName("bpmn:messageEventDefinition");
        if(messageEventDefinitions.length>0){
          var camunda_class = endEvent.getAttribute('camunda:class');
          var name = endEvent.getAttribute('name');
          var id = endEvent.getAttribute('id');
          if(name == ''){
            self.log(chalk.red("Error : end Event '"+id+"' whit no name "));
            error = true;
          }
          if(camunda_class == ''){
            nodeOption = {
              name: self.config.get("processPackage")+ ".endevent." + _.upperFirst(_.camelCase(name)),
              value : self.config.get("processPackage")+ ".endevent." + _.upperFirst(_.camelCase(name)),
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
            self.classNodes[nodeOption.name] = endEvent;
          }
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
    utils.create_clases(self,this.javaDelegates,this.javaDelegatesThatEmitsMessages);
  }

  /**
   * This method write the main files for a camunda project using MVN
   */
  writing(){
    //BPMN FILE
    utils.add_xmlns_camunda(this.doc);
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
