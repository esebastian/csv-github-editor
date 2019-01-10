/* global FileReader, Papa, Handsontable, Base64 */

var INTRO = 13

var input = document.getElementById('url-input')
var load = document.getElementById('load-button')
var save = document.getElementById('save-button')

var tableContainer = document.getElementById('handsontable-container')
var saveContainer = document.getElementById('save-container')
var consoleContainer = document.getElementById('console-container')

var handsontableTable = {}

var exportAsString = function (table) {
  var data = [table.getColHeader()].concat(table.getData())

  var joinWithComma = function (array) {
    return array.join(',')
  }

  var result = data.map(joinWithComma).join('\n') + '\n'

  return result
}

var getOwner = function (githubUrl) {
  return githubUrl.split('/')[3]
}

var getRepo = function (githubUrl) {
  return githubUrl.split('/')[4]
}

var getPath = function (githubUrl) {
  return githubUrl
    .split('/')
    .slice(6)
    .join('/')
}

input.onkeyup = function (event) {
  if (event.keyCode === INTRO) {
    load.onclick()
  }
}

load.onclick = function () {
  var url = input.value

  if (url === '') {
    return
  }

  // reset table container and table
  tableContainer.innerHTML = ''
  tableContainer.className = ''
  handsontableTable = {}

  // reset messages
  consoleContainer.innerText = ''

  // hide save container
  saveContainer.style.display = 'none'

  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      handsontableTable = new Handsontable(tableContainer, {
        data: results.data,
        rowHeaders: true,
        colHeaders: results.meta.fields,
        columnSorting: true,
        contextMenu: true
      })

      saveContainer.style.display = 'block'
    },
    error: function (error) {
      consoleContainer.innerText = error
    }
  })
}

save.onclick = function () {
  var token = document.getElementById('token-input').value

  var owner = getOwner(input.value)
  var repo = getRepo(input.value)
  var path = getPath(input.value)

  var apiUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path

  var data = exportAsString(handsontableTable)
  var content = Base64.encode(data)

  consoleContainer.innerText = 'Saving...'

  // update the file in GitHub
  fetch(apiUrl, {headers: {Authorization: 'token ' + token}})
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Error: The file couldn\'t be saved')
      }

      return response.json()
    })
    .then(function (jsonResponse) {
      var currentSha = jsonResponse.sha
      var payload = {
        message: 'File ' + path + ' updated from CSV Github Editor',
        content: content,
        sha: currentSha
      }

      fetch(apiUrl, {
        method: 'PUT',
        headers: {Authorization: 'token ' + token},
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Error: The file couldn\'t be saved')
          }
        })
        .then(function () {
          consoleContainer.innerText = 'The file was saved succesfully'
        })
        .catch(function (error) {
          consoleContainer.innerText = error.message
        })
    })
    .catch(function (error) {
      consoleContainer.innerText = error.message
    })
}
