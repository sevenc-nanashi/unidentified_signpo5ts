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
        .iter()
        .map(|row| {
            let mut row_separated = vec![vec![row[0]]];
            for pixel in row.iter().skip(1) {
                let last_section = row_separated.last_mut().unwrap();
                let last_pixel = last_section.last().unwrap();
                // let total_diff = u16::from(last_pixel.0.abs_diff(pixel.0))
                //     + u16::from(last_pixel.1.abs_diff(pixel.1))
                //     + u16::from(last_pixel.2.abs_diff(pixel.2))
                //     + u16::from(last_pixel.3.abs_diff(pixel.3));
                let diffs = i32x4_abs(i32x4_sub(*last_pixel, *pixel));
                let total_diff = i32x4_extract_lane::<0>(diffs)
                    + i32x4_extract_lane::<1>(diffs)
                    + i32x4_extract_lane::<2>(diffs)
                    + i32x4_extract_lane::<3>(diffs);
                if total_diff > level {
                    row_separated.push(vec![*pixel]);
                } else {
                    last_section.push(*pixel);
                }
            }
            for section in row_separated.iter_mut() {
                section.sort_by_key(|x| {
                    let r = i32x4_extract_lane::<0>(*x);
                    let g = i32x4_extract_lane::<1>(*x);
                    let b = i32x4_extract_lane::<2>(*x);
                    let a = i32x4_extract_lane::<3>(*x);
                    -(r + g + b + a)
                });
            }
            row_separated.iter().flatten().copied().collect::<Vec<_>>()
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
    let width = matrix.len();
    let height = matrix[0].len();
    let mut transposed = vec![vec![matrix[0][0]; width]; height];
    for (i, row) in matrix.iter().enumerate() {
        for (j, v) in row.iter().enumerate() {
            transposed[j][i] = *v;
        }
    }
    transposed
}
