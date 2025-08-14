use core::arch::wasm32::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub unsafe fn sort(image: Vec<u8>, width: usize, height: usize, level: u16) -> Vec<u8> {
    console_error_panic_hook::set_once();
    let grouped_by_pixel = image
        .chunks(4)
        .map(|x| i32x4(x[0] as _, x[1] as _, x[2] as _, x[3] as _))
        .collect::<Vec<_>>();
    let grouped_by_row = grouped_by_pixel
        .chunks(width)
        .map(|x| x.to_vec())
        .collect::<Vec<_>>();
    let transposed = transpose(grouped_by_row);
    let level = i32::from(level);

    let sorted = transposed
        .into_iter()
        .map(|mut row| {
            if row.is_empty() {
                return row;
            }
            let mut sections = vec![(0, 1)];
            for i in 1..row.len() {
                let last_pixel_of_section = row[sections.last().unwrap().1 - 1];
                let current_pixel = row[i];

                let diffs = i32x4_abs(i32x4_sub(last_pixel_of_section, current_pixel));
                let x_shuffled = i32x4_shuffle::<1, 0, 3, 2>(diffs, i32x4_splat(0));
                let sum1 = i32x4_add(diffs, x_shuffled);
                let x_shuffled2 = i32x4_shuffle::<2, 3, 0, 1>(sum1, i32x4_splat(0));
                let sum2 = i32x4_add(sum1, x_shuffled2);
                let total_diff = i32x4_extract_lane::<0>(sum2);

                if total_diff > level {
                    sections.push((i, i + 1));
                } else {
                    sections.last_mut().unwrap().1 = i + 1;
                }
            }

            for (start, end) in sections {
                row[start..end].sort_by_key(|x| {
                    let x_shuffled = i32x4_shuffle::<1, 0, 3, 2>(*x, i32x4_splat(0));
                    let sum1 = i32x4_add(*x, x_shuffled);
                    let x_shuffled2 = i32x4_shuffle::<2, 3, 0, 1>(sum1, i32x4_splat(0));
                    let sum2 = i32x4_add(sum1, x_shuffled2);
                    -i32x4_extract_lane::<0>(sum2)
                });
            }
            row
        })
        .collect::<Vec<_>>();

    let transposed_back = transpose(sorted);

    transposed_back
        .iter()
        .flatten()
        .flat_map(|v| {
            let r = i32x4_extract_lane::<0>(*v) as u8;
            let g = i32x4_extract_lane::<1>(*v) as u8;
            let b = i32x4_extract_lane::<2>(*v) as u8;
            let a = i32x4_extract_lane::<3>(*v) as u8;
            [r, g, b, a]
        })
        .collect()
}

fn transpose<T: Copy>(matrix: Vec<Vec<T>>) -> Vec<Vec<T>> {
    if matrix.is_empty() || matrix[0].is_empty() {
        return Vec::new();
    }
    let height = matrix.len();
    let width = matrix[0].len();
    let default_val = matrix[0][0];
    let mut transposed = vec![vec![default_val; height]; width];

    const BLOCK_SIZE: usize = 16;

    for i in (0..height).step_by(BLOCK_SIZE) {
        for j in (0..width).step_by(BLOCK_SIZE) {
            // for row in i..std::cmp::min(i + BLOCK_SIZE, height) {
            //     for col in j..std::cmp::min(j + BLOCK_SIZE, width) {
            //         transposed[col][row] = matrix[row][col];
            //     }
            // }
            for (irow, row) in matrix.iter().enumerate().skip(i).take(BLOCK_SIZE) {
                for (jcol, &value) in row.iter().enumerate().skip(j).take(BLOCK_SIZE) {
                    if irow < height && jcol < width {
                        transposed[jcol][irow] = value;
                    }
                }
            }
        }
    }
    transposed
}
