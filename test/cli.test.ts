import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as cliModule from '../src/cli';
import child_rocess = require('child_process');

describe('cli', function(){
    let sandbox = sinon.createSandbox();
    before(function() {

    });

    this.afterEach(function(){
        sandbox.restore();
    })
    
    it("trying to mock", function() {
        sandbox.stub(cliModule,'getToolLocation').resolves("test");
        sandbox.stub(child_rocess, 'exec').yieldsAsync(new Error('Error message'), 'stdout', 'stderr');
        let cli:cliModule.Cli = cliModule.create();
        return cli.execute('odo').then(function (data){
            console.log(data);
        });
    });

});


