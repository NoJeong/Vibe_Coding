#include <stdio.h>
#include <locale.h>

int main(void) {
    setlocale(LC_ALL, "ko_KR.UTF-8");    
    int arr[5] = { 10, 20, 30, 40, 50 };
    int *p = arr; // arr == &arr[0]

    for (int i = 0; i < 5; ++i) {
        printf("p + %d = %p, *(p + %d) = %d\n",
               i, (void*)(p + i), i, *(p + i));
    }

    return 0;
}