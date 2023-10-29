// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // derived example from https://github.com/microsoft/vscode-extension-samples/blob/main/decorator-sample/src/extension.ts
    let timeout: ReturnType<typeof setTimeout> | undefined = undefined;

    const overDueDateDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: { id: 'wbk.datehighlighter.overdueBackground' },
        overviewRulerColor: { id: 'wbk.datehighlighter.overdueBackground' },
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    const todayDateDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: { id: 'wbk.datehighlighter.todayBackground' },
        overviewRulerColor: { id: 'wbk.datehighlighter.todayBackground' },
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    const futureDateDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: { id: 'wbk.datehighlighter.futureBackground' },
        overviewRulerColor: { id: 'wbk.datehighlighter.futureBackground' },
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });
    

    let activeEditor = vscode.window.activeTextEditor;


	function updateDecorations() {
		if (!activeEditor) {
			console.debug("Skip highlighting because there is no activeEditor");
			return;
		}

		const config = vscode.workspace.getConfiguration("datehighlighter");
		let allowGlobs: Array<String>|undefined = config.get("onlyHighlightGlob");
		if (!allowGlobs) {
			allowGlobs = ["**/*.{md,txt}"];
		}
		let anyMatch = allowGlobs.some((glob) => {
			if (!activeEditor) {
				return false;
			}
			return vscode.languages.match({pattern: glob as vscode.GlobPattern}, activeEditor.document) !== 0;
		});
		if (!anyMatch) {
			console.debug("Skip highlighting because globs don't match.");
			return;
		}

	
		const regEx = /(\d{4})-(\d{2})-(\d{2})/g;
		const text = activeEditor.document.getText();
		const overdues: vscode.DecorationOptions[] = [];
		const todays: vscode.DecorationOptions[] = [];
        const futures: vscode.DecorationOptions[] = [];
		let match;
		while ((match = regEx.exec(text))) {
			const startPos = activeEditor.document.positionAt(match.index);
			const endPos = activeEditor.document.positionAt(match.index + match[0].length);
			const decoration = { 
                range: new vscode.Range(startPos, endPos), 
                hoverMessage: 'Number **' + match[0] + '**' 
            };
			
			// super hacky markdown strike detection
			if (match.index-2 >= 0) {
				if (text.substring(match.index-2, match.index) === "~~") {
					continue;
				}
			}
			// super hacky markdown [x] detection
			let lastNewlinePos = text.lastIndexOf('\n', match.index);
			let curLine;
			if (lastNewlinePos !== -1) {
				curLine = text.substring(lastNewlinePos+1, match.index);
			} else {
				curLine = text.substring(0, match.index);
			}
			if (curLine.indexOf("[x]") > 0) {
				continue;
			}
			

            let matchedDate = new Date(parseInt(match[1]), parseInt(match[2])-1, parseInt(match[3]));
            let now = new Date();
            let todaysDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            if (matchedDate.getTime() < todaysDate.getTime()) {
                overdues.push(decoration);
            }
            else if (matchedDate.getTime() === todaysDate.getTime()) {
                todays.push(decoration);
            } else {
                futures.push(decoration);
            }
		}
		activeEditor.setDecorations(overDueDateDecorationType, overdues);
		activeEditor.setDecorations(todayDateDecorationType, todays);
        activeEditor.setDecorations(futureDateDecorationType, futures);
	}

	function triggerUpdateDecorations(throttle = false) {
		if (timeout) {
            let validTimer:ReturnType<typeof setTimeout> = timeout;
			clearTimeout(validTimer);
			timeout = undefined;
		}
		if (throttle) {
			timeout = setTimeout(updateDecorations, 500);
		} else {
			updateDecorations();
		}
	}

	if (activeEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations(true);
		}
	}, null, context.subscriptions);

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "date-highlighter" is now active!');


}

// This method is called when your extension is deactivated
export function deactivate() {}
