#include <stdio.h>
#include <locale.h>

int main(void) {
    setlocale(LC_ALL, "ko_KR.UTF-8");
    int age = 29;
    char name[] = "Nojeong";
    printf("안녕하세요! 제 이름은 %s이고, 나이는 %d살입니다.\n", name, age);
    return 0;
}
