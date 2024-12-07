function is_align_indicator(text) {
    let char;
    for (let i = 0; i < text.length; i++) {
        char = text.charCodeAt(i);
        
        if (char !== 0x2D/* - */ && char !== 0x3A/* : */) {
            return false;
        }
    }
    return true;
}

function add_align_entry(text, aligns) {
    if (text.charCodeAt(text.length - 1) === 0x3A/* : */) {
        aligns.push(text.charCodeAt(0) === 0x3A/* : */ ? 'center' : 'right')
    } else if (text.charCodeAt(0) === 0x3A/* : */) {
        aligns.push('left')
    } else {
        aligns.push('')
    }
}

export default function custom_table(state, startLine, endLine, silent) {

    // should have at least two lines
    if (startLine + 2 > endLine) { return false; }

    let begin_marker = ":::";

    let pos = state.bMarks[startLine] + state.tShift[startLine];

    if (state.src.charCodeAt(pos) !== 0x3A /* : */) {
        return false;
    }

    if (state.src.slice(pos, pos + begin_marker.length) !== begin_marker) {
        return false;
    }

    let start_pos = state.src.indexOf("|", pos + begin_marker.length);
    if (start_pos == -1) {
        return false;
    }

    if (silent) {
        return true;
    }

    const oldParentType = state.parentType
    state.parentType = 'table';

    const token_to = state.push('table_open', 'table', 1);
    token_to.map = [startLine, 0];

    const token_tho = state.push('thead_open', 'thead', 1);
    token_tho.map = [startLine, startLine + 1];

    const token_htro = state.push('tr_open', 'tr', 1);
    token_htro.map = [startLine, startLine + 1];
    let tbodyLines;
    let current_line;


    let thead = true;
    let aligns = [];
    let cell_start_line_number = startLine;
    let columnCount = 0;
    let current_cols_in_row = 0;

    for (current_line = startLine + 1; current_line < endLine; current_line++) {
        if (state.src.slice(state.bMarks[current_line] + state.tShift[current_line],
            state.eMarks[current_line]) === ":::") {
            break;
        }

        for (pos = state.bMarks[current_line] + state.tShift[current_line];
            pos < state.eMarks[current_line];
            pos++) {

            if ((state.src.charCodeAt(pos) === 0x7c /* | */)) {
                if (pos > start_pos) {
                    let cell_contents = state.src.slice(start_pos, pos);
                    if (thead) {
                        if (is_align_indicator(cell_contents.trim())) {
                            add_align_entry(cell_contents.trim(), aligns);
                        } else {
                            const token_ho = state.push('th_open', 'th', 1);
                            token_ho.map = [cell_start_line_number, current_line + 1];
                            cell_start_line_number = current_line;

                            if (aligns[columnCount]) {
                                token_ho.attrs = [['style', 'text-align:' + aligns[columnCount]]];
                            }
                            let tokens = [];
                            state.md.block.parse(cell_contents.trim(), state.md, state.env, tokens);
                            state.tokens.push(...tokens);

                            state.push('th_close', 'th', -1);
                            columnCount++;
                        }

                        if (cell_contents.endsWith("\n\n")) {
                            // close thead here
                            state.push('tr_close', 'tr', -1);
                            state.push('thead_close', 'thead', -1);
                            const token_tbo = state.push('tbody_open', 'tbody', 1);
                            token_tbo.map = tbodyLines = [current_line + 1, 0];

                            const token_tro = state.push('tr_open', 'tr', 1)
                            token_tro.map = [current_line, current_line + 1];
                            thead = false;
                        }
                    } else {
                        // add td contents here
                        // wrap cells and create tr as needed
                        const token_tdo = state.push('td_open', 'td', 1);
                        token_tdo.map = [cell_start_line_number, current_line + 1];
                        cell_start_line_number = current_line;

                        if (aligns[current_cols_in_row]) {
                            token_tdo.attrs = [['style', 'text-align:' + aligns[current_cols_in_row]]];
                        }
                        let tokens = [];
                        state.md.block.parse(cell_contents.trim(), state.md, state.env, tokens);
                        state.tokens.push(...tokens);

                        state.push('td_close', 'td', -1);
                        current_cols_in_row++;

                        if (current_cols_in_row == columnCount) {
                            state.push('tr_close', 'tr', -1);
                            state.push('tr_open', 'tr', 1);
                            current_cols_in_row = 0;
                        }
                    }
                    start_pos = pos + 1;
                } else {
                    start_pos++;
                }
            }
        }
    }

    if (pos > start_pos) {
        if (tbodyLines) {
            const token_tdo = state.push('td_open', 'td', 1);
            token_tdo.map = [cell_start_line_number, current_line + 1];
            cell_start_line_number = current_line;
            if (aligns[current_cols_in_row]) {
                token_tdo.attrs = [['style', 'text-align:' + aligns[current_cols_in_row]]];
            }
            let tokens = [];
            state.md.block.parse(state.src.slice(start_pos, pos), state.md, state.env, tokens);
            state.tokens.push(...tokens);
            state.push('td_close', 'td', -1);

            state.push('tr_close', 'tr', -1);
            state.push('tbody_close', 'tbody', -1);
            tbodyLines[1] = current_line;
        } else {
            const token_ho = state.push('th_open', 'th', 1);
            token_ho.map = [cell_start_line_number, current_line + 1];
            cell_start_line_number = current_line;
            if (aligns[columnCount]) {
                token_ho.attrs = [['style', 'text-align:' + aligns[columnCount]]];
            }
            let tokens = [];
            state.md.block.parse(state.src.slice(start_pos, pos), state.md, state.env, tokens);
            state.tokens.push(...tokens);
            state.push('th_close', 'th', -1);
            state.push('thead_close', 'thead', -1);
        }
    }

    state.push('table_close', 'table', -1)
    token_to.map[1] = current_line;
    
    state.parentType = oldParentType;
    state.line = current_line + 1;
    return true;
}
