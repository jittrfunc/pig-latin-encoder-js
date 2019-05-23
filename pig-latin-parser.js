/** This solution makes use of the cluster module for multiprocessing the paragraphs. 
 * Each paragraph read from input.txt is round robined to a worker process, which then pig latin encodes the words 
 * and sends back the paragraph to the master process which then writes it to the output file.
 */

const fs = require('fs');
const os = require('os');
const readline = require('readline');
const cluster = require('cluster');

if(cluster.isMaster) {
    //Cleanup any previous output file generated. FOR TESTING PURPOSES ONLY. 
    try {
        fs.unlinkSync("output.txt");
    } catch(e){
        //ignore
    }
    
    console.time("Time taken");
    process.on('exit', () => console.timeEnd("Time taken")); //log time

    const numCPUs = os.cpus().length;
    let workers = [];

    for(let i = 0; i < numCPUs; i++) {

        let worker = cluster.fork();
        workers.push(worker);

        worker.on('message', (msg) => {
            console.log('Received paragraph from worker..')
            fs.appendFile('output.txt', msg + "\n", e => { if(e) console.log(e) });
        });
    }

    let lineReader = require('readline').createInterface({
        input: fs.createReadStream('input.txt')
    });

    let counter = 0;

    lineReader.on('line', (line) => {      
        if(line !== "") {
            console.log('Read a paragraph from input..');
            workers[counter++ % numCPUs].send(line); //round robin paragraph to the workers
        }          
    });

    lineReader.on('close', () => {
        console.log('Reader is closed..');    
        for(let i = 0; i < numCPUs; i++) workers[i].send('shutdown');
    });
}

if(cluster.isWorker) {

    process.on('message', (msg) => {
        
        if(msg === 'shutdown') process.exit();

        let out = "";
        let temp = "";

        for(let i = 0; i < msg.length; i++) {

            if(msg.charAt(i) == " " || msg.charAt(i) == "," || msg.charAt(i) == "." || 
               msg.charAt(i) == ";" || msg.charAt(i) == "!") { 

                if(temp === "") 
                    out += msg.charAt(i); //handles case of a space just after a punctuation(comma, dot, etc)
                else {
                    out += PigLatinEncode(temp) + msg.charAt(i);
                    temp = "";
                }                
                continue;
            }

            temp += msg.charAt(i);
        }

        if(temp != "") {
            out += PigLatinEncode(temp);
        }

        process.send(out);    
    });
}

//Pig latin encode
function PigLatinEncode(word) {
    if(word.charAt(0) == 'a' || word.charAt(0) == 'A' || 
       word.charAt(0) == 'e' || word.charAt(0) == 'E' || 
       word.charAt(0) == 'i' || word.charAt(0) == 'I' || 
       word.charAt(0) == 'o' || word.charAt(0) == 'O' || 
       word.charAt(0) == 'u' || word.charAt(0) == 'U') {
        return word + "ay";
    }
    else {
        return word.substr(1) + word.charAt(0) + "ay";
    }
}

