var zencodeResults = []

function allocateUTF8(str) {
    var size = lengthBytesUTF8(str) + 1;
    var ret = _malloc(size);
    if (ret) stringToUTF8Array(str, HEAP8, ret, size);
    return ret;
}

var ZC = (function() {
    let bobKeys = null
    let aliceKeys = null
    let t0 = 0
    let t1 = 0
    let zencode_encrypt_contract = `Scenario 'simple': Alice sends a secret to Bob
Given that I am known as 'Alice'
and I have my 'keypair'
and I have inside 'Bob' a valid 'public key'
and I have a 'base64'
When I encrypt the 'base64' to 'secret message' for 'Bob'
Then print the 'secret message'
`
    const init = function() {
        generateKeys()
        setupForm()
		$('#encrypt_contract').html(zencode_encrypt_contract)

    };

    const generateKeys = () => {
        zencode(`Scenario 'simple': $scenario
                 Given that I am known as 'Bob'
                 When I create my new keypair
                 Then print my data`, null, null)
        bobKeys = JSON.parse(zencodeResults.pop())
        $("#bob").html(JSON.stringify({Bob: { public_key: bobKeys.Bob.keypair.public_key}}))

        zencode(`Scenario 'simple': $scenario
                 Given that I am known as 'Alice'
                 When I create my new keypair
                 Then print my data`, null, null)
        aliceKeys = JSON.parse(zencodeResults.pop())
        $("#alice").html(JSON.stringify(aliceKeys))
    }

    const setupForm = () => {
        const form = document.querySelector('form')

        form.addEventListener('submit', e => {
            e.preventDefault()

            const file = document.querySelector('[type=file]').files[0]
            const reader = new FileReader();
            reader.onloadend = evt => {
                if (evt.target.readyState == FileReader.DONE) {
                    encrypt(evt.target.result)
                }
            }
            reader.readAsText(file, "UTF-8")
        })
    }

    const encrypt = (rawContent) => {
        const content = [
            { base64: btoa(unescape(encodeURIComponent(rawContent))) },
            { Bob: { public_key: bobKeys.Bob.keypair.public_key }}
        ]

        zencode(zencode_encrypt_contract,
                JSON.stringify(aliceKeys),
                JSON.stringify(content))

        $("#result").html(zencodeResults)
    }

    const zencode = function(code, keys, data) {
        zencodeResults = []
        t0 = performance.now()
        if (data) {
            const pointer = allocateUTF8(data);
            Module.ccall('zencode_exec', 
                            'number',
                            ['string', 'string', 'string', 'number', 'number'],
                            [code, null, keys, pointer, 0]);
            Module._free(pointer);
        } else {
            Module.ccall('zencode_exec', 
                            'number',
                            ['string', 'string', 'string', 'string', 'number'],
                            [code, null, keys, data, 0]);
        }
        t1 = performance.now()
        $('#speed').html(t1-t0)
    }

    return {
        init: init
    }
})();

var Module = {
    preRun: [],
    postRun: [],
    print: text => {
        zencodeResults.push(text)
    },
    printErr: function(text) {
        // if (arguments.length > 1)
        //     text = Array.prototype.slice.call(arguments).join(' ')
        // console.error(text)
    },
    exec_ok: () => {},
    exec_error: () => {},
    onRuntimeInitialized: function () {
        ZC.init()
    }
}
