'use strict';
/**
 * @author Patricio Soto
 */
var Generator = require('yeoman-generator');
var chalk = require('chalk');
var _ = require('lodash');
var fs = require('fs');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
var serializer = new XMLSerializer();
var utils = require("../utils");
var path = require('path');
module.exports = class extends Generator {

  /**
   * Constructor for the generator
   * @param {object} args
   * @param {object} opts
   */
  constructor(args, opts) {
    super(args, opts);
    this.doc = null;
    this.forms = [];
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

      var element = doc.getElementById(self.elementid);
      if(element == null){
        self.log(chalk.red("Element not found, try to run like this 'yo camunda:form <elementid> '"));
        return ;
      }
      var name = element.getAttribute('name');
      var id = element.getAttribute('id');

      if(name == ''){
        self.log(chalk.yellow("Error : element '"+id+"' whit no name "));
        error = true;
        return;
      }
      self.log(( chalk.green('Element found, the form is generating') ));
      utils.add_form(self,element);
      done();
    });
  }
  /**
   * This method create the forms and atach them to the bpmn
   */
  createForms(){
    var self = this;
    var formsChoices = [];
    var formsChoicesHashs = {};
    var form = self.forms[0];
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

  end() {
    this.log(chalk.green('Form generated successfully'));
  }
}
